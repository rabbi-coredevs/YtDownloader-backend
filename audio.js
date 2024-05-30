const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const morgan = require('morgan');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.use(morgan('common'));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

app.post('/video-info', async (req, res) => {
  try {
    const { uri } = req.body;
    if (!uri) {
      return res.status(400).json({ error: 'URI is required' });
    }
    if (!ytdl.validateURL(uri)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(uri);
    const title = info.videoDetails.title;
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    const thumbnail = info.videoDetails.thumbnails[0];
    // console.log(thumbnail);
    res.json({ title, formats,thumbnail });
  } catch (error) {
    console.error('Request processing error:', error);
    res.status(500).json({ error: 'Error processing request' });
  }
});

app.post('/download', async (req, res) => {
  try {
    const { uri, format } = req.body;
    if (!uri) {
      return res.status(400).json({ error: 'URI is required' });
    }
    if (!ytdl.validateURL(uri)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(uri);
    const title = info.videoDetails.title;
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase(); // Make filename safe
    const outputDir = path.join(__dirname, 'Downloads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const videoFilePath = path.join(outputDir, `${safeTitle}.mp4`);

    const videoStream = ytdl(uri, { quality: format ? format : 'highestvideo' });
    const audioStream = ytdl(uri, { quality: 'highestaudio' });

    const ffmpegProcess = cp.spawn(ffmpeg, [
      '-i', 'pipe:3',
      '-i', 'pipe:4',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-strict', 'experimental',
      videoFilePath
    ], {
      windowsHide: true,
      stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe']
    });

    audioStream.pipe(ffmpegProcess.stdio[3]).on('error', (err) => {
      console.error('Audio stream error:', err);
      res.status(500).json({ error: 'Error processing audio stream' });
    });

    videoStream.pipe(ffmpegProcess.stdio[4]).on('error', (err) => {
      console.error('Video stream error:', err);
      res.status(500).json({ error: 'Error processing video stream' });
    });

    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).send('Error combining video files');
      }

      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
      res.setHeader('Content-Type', 'video/mp4');
      const fileStream = fs.createReadStream(videoFilePath);

      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        res.status(500).send('Error reading video file');
      });

      //delete the video form server side once response is sent to client side
      fileStream.pipe(res).on('finish', () => {
        fs.unlink(videoFilePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    });

  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).json({ error: 'Error downloading video' });
  }
});

app.post('/download-audio', async (req, res) => {
  try {
    const { uri } = req.body;
    if (!uri) {
      return res.status(400).json({ error: 'URI is required' });
    }
    if (!ytdl.validateURL(uri)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(uri);
    const title = info.videoDetails.title;
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase(); // Make filename safe
    const outputDir = path.join(__dirname, 'Downloads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const audioFilePath = path.join(outputDir, `${safeTitle}.mp3`);

    const audioStream = ytdl(uri, { quality: 'highestaudio' });

    const ffmpegProcess = cp.spawn(ffmpeg, [
      '-i', 'pipe:3',
      '-vn', // Extract only the audio
      '-acodec', 'libmp3lame', // Encode to MP3
      audioFilePath
    ], {
      windowsHide: true,
      stdio: ['inherit', 'inherit', 'inherit', 'pipe']
    });

    audioStream.pipe(ffmpegProcess.stdio[3]).on('error', (err) => {
      console.error('Audio stream error:', err);
      res.status(500).json({ error: 'Error processing audio stream' });
    });

    ffmpegProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).send('Error converting audio');
      }

      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
      res.setHeader('Content-Type', 'audio/mp3');
      const fileStream = fs.createReadStream(audioFilePath);

      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        res.status(500).send('Error reading audio file');
      });

      // Delete the audio file from the server after sending the response
      fileStream.pipe(res).on('finish', () => {
        fs.unlink(audioFilePath, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    });

  } catch (error) {
    console.error('Error downloading audio:', error);
    res.status(500).json({ error: 'Error downloading audio' });
  }
});

