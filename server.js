const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.use(morgan('common'));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/download', async (req, res) => {
    try {
        // return console.log('Download')
        const { uri, quality } = req.body;
        if (!uri) {
            return res.status(400).json({ error: 'URI is required' });
        }
        if (!ytdl.validateURL(uri)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(uri);
        // return res.send(info);
        const outputDir = path.join(__dirname, 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        const videoFilePath = path.join(outputDir, `${info.videoDetails.title}-${quality}.mp4`);
        const audioFilePath = path.join(outputDir, `${info.videoDetails.title}.mp3`);

        // Start downloading audio and video streams
        const audioStream = ytdl(uri, { quality: 'highestaudio' });
        const videoStream = ytdl(uri, { quality: quality || 'highestvideo' });

        // Use ffmpeg to combine audio and video
        const ffmpegProcess = cp.spawn(ffmpeg, [
            '-i', 'pipe:3', // Audio input from pipe
            '-i', 'pipe:4', // Video input from pipe
            '-c:v', 'copy', // Copy video codec
            '-c:a', 'aac', // AAC audio codec for wider compatibility
            '-strict', 'experimental', // Enable experimental features for AAC codec
            videoFilePath
        ], {
            windowsHide: true,
            stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
        });

        // Pipe audio and video streams to ffmpeg
        audioStream.pipe(ffmpegProcess.stdio[3]).on('error', (err) => {
            console.error('Audio stream error:', err);
            res.status(500).json({ error: 'Error processing audio stream' });
        });

        videoStream.pipe(ffmpegProcess.stdio[4]).on('error', (err) => {
            console.error('Video stream error:', err);
            res.status(500).json({ error: 'Error processing video stream' });
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Successfully combined audio and video');
                res.status(200).send(`Finished downloading: ${videoFilePath}`);
            } else {
                console.error(`ffmpeg process exited with code ${code}`);
                res.status(500).json({ error: 'Error during ffmpeg processing' });
            }
        });

    } catch (error) {
        console.error('Request processing error:', error);
        res.status(500).json({ error: 'Error processing request' });
    }
});


app.post('/download-audio', async (req, res) => {
    try {
        const { uri } = req.body;
        if (!uri) {
            return res.status(400).send('URI is required');
        }
        if (!ytdl.validateURL(uri)) {
            return res.status(400).send("Invalid YouTube URL");
        }

        const info = await ytdl.getInfo(uri);
        const outputDir = path.join(__dirname, 'Downloads');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const safeTitle = info.videoDetails.title.replace(/[\/\?<>\\:\*\|"]/g, '_');
        const audioFilePath = path.join(outputDir, `${info.videoDetails.title}.mp3`);

        const audioStream = ytdl(uri, { quality: 'highestaudio' });

        const ffmpegProcess = cp.spawn(ffmpeg, [
            '-loglevel', '8', '-hide_banner',
            '-i', 'pipe:3',
            '-q:a', '0',
            '-map', 'a',
            audioFilePath,
        ], {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
        });

        ffmpegProcess.on('close', () => {
            console.log(`Finished downloading: ${audioFilePath}`);
            res.download(audioFilePath, `${safeTitle}.mp3`, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                    res.status(500).json({ error: 'Error sending file' });
                }
                // Optional: Clean up the file after sending
                // fs.unlink(audioFilePath, (unlinkErr) => {
                //     if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                // });
            });
            // res.status(200).send(`Finished downloading: ${audioFilePath}`);
        });

        ffmpegProcess.on('error', (err) => {
            console.error(err);
            res.status(500).send('Error processing audio');
        });

        audioStream.pipe(ffmpegProcess.stdio[3]);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing request');
    }
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});