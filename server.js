// const express = require("express");
// const ytdl = require("ytdl-core");
// const fs = require("fs");
// const cors = require("cors");
// const path = require("path");

// const app = express();
// const port = 3000;

// // Middleware to parse JSON bodies
// app.use(express.json());
// app.use(cors());




// app.post('/download', async (req, res) => {
//     try {
//         const { uri } = req.body;
//         if (!uri) {
//             return res.status(400).send('uri is required');
//         }
//         const isValidURL = ytdl.validateURL(uri);
//         if (!isValidURL) {
//             return res.status(400).send('Invalid YouTube URL');
//         }
//         // Get video info from YouTube
//         const info = await ytdl.getInfo(uri);

//         // Select the video format and quality
//         const format = ytdl.chooseFormat(info.formats, { quality: '18' });

//         // Create a write stream to save the video file
//         // const outputFilePath = `${info.videoDetails.title}.${format.container}`;
//         // const outputFilePath = path.join('/home/rabbi', `${info.videoDetails.title}.${format.container}`);

//         const outputDir = path.join(__dirname, 'Downloads');

//         // Create the directory if it doesn't exist
//         if (!fs.existsSync(outputDir)) {
//             fs.mkdirSync(outputDir);
//         }

//         // Now, set the output file path
//         const outputFilePath = path.join(outputDir, `${info.videoDetails.title}.${format.container}`);

//         // return console.log(outputFilePath);
//         const outputStream = fs.createWriteStream(outputFilePath);

//         // Download the video file
//         ytdl.downloadFromInfo(info, { format: format }).pipe(outputStream);

//         // When the download is complete, show a message
//         outputStream.on('finish', () => {
//             console.log(`Finished downloading: ${outputFilePath}`);
//             res.status(200).send(`Finished downloading: ${outputFilePath}`);
//         });

//         // Handle download errors
//         outputStream.on('error', (err) => {
//             console.error(err);
//             res.status(500).send('Error downloading video');
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Error processing request');
//     }
// });

// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`);
// });


const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path'); // To handle file paths
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/download', async (req, res) => {
    try {
        const { uri } = req.body;
        if (!uri) {
            return res.status(400).send('uri is required');
        }
        const isValidURL = ytdl.validateURL(uri);
        if (!isValidURL) {
            return res.status(400).send("Invalid YouTube URL");
        }
        // Get video info from YouTube
        const info = await ytdl.getInfo(uri);
        
        // Select the video format and quality
        const format = ytdl.chooseFormat(info.formats, { quality: '18' });

        const outputDir = path.join(__dirname, 'Downloads');

                // Create the directory if it doesn't exist
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir);
                }

        // Create a write stream to save the video file
        const outputFilePath = path.join(outputDir, `${info.videoDetails.title}.${format.container}`);
        const outputStream = fs.createWriteStream(outputFilePath);

        // Download the video file
        ytdl.downloadFromInfo(info, { format: format }).pipe(outputStream);

        // When the download is complete, show a message
        outputStream.on('finish', () => {
            console.log(`Finished downloading: ${outputFilePath}`);
            res.status(200).send(`Finished downloading: ${outputFilePath}`);
        });

        // Handle download errors
        outputStream.on('error', (err) => {
            console.error(err);
            res.status(500).send('Error downloading video');
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error processing request');
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
