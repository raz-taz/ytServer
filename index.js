const express = require('express');
const app = express();
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const search = require('youtube-search');

const port = 3001
const host = "192.168.3.168"

const downloadAndConvertAudio = (videoUrl, outputPath) => {
  return new Promise((resolve, reject) => {
    const videoStream = ytdl(videoUrl, { quality: 'highestaudio' });

    const ffmpegCommand = ffmpeg(videoStream)
      .audioBitrate(128)
      .format('mp3')
      .on('end', () => {
        console.log('Audio conversion completed');
        resolve();
      })
      .on('error', (error) => {
        console.error('Error converting audio:', error);
        reject(error);
      });

    ffmpegCommand.save(outputPath);
  });
};



app.get('/download/byMusicId/:songId', async (req, res) => {
  const songId = req.params.songId;
  const optionsDezzer = {
    method: 'GET',
    url: `https://api.deezer.com/track/${songId}`,
  };
  try {
    const responseDez = await axios.request(optionsDezzer);
    const query = `${responseDez.data.title} by ${responseDez.data.artist.name}`
    console.log(query)
    const options = {
      maxResults: 1,
      key: 'AIzaSyC4YCCBJqldoAH_QfsSEwly4zd5ApQ7-RA'
    };
    search(query, options, async (err, results) => {
      if (err) return console.log(err);
      const data = results[0]

      const outputFileName = `${songId}.mp3`; 
      const outputPath = path.join(__dirname, outputFileName); 

      await downloadAndConvertAudio(`http://www.youtube.com/watch?v=${data.id}`, outputPath);

      res.sendFile(outputPath, (error) => {
        if (error) {
          console.error('Error sending audio file:', error);
          res.status(500).json({ error: 'Failed to send audio file' });
        } else {
          console.log('Audio file sent successfully');
          fs.unlinkSync(outputPath); // Delete the temporary output file
        }
      });
    })
  } catch (error) {
    res.send(error);
  }

});

app.get('/search/:searchId', async (req, res) => {
  const searchId = req.params.searchId;
  const optionsDezzer = {
    method: 'GET',
    url: `https://api.deezer.com/search/autocomplete?q=${searchId}`,
  };

  let songs = []

  try {
    const responseDez = await axios.request(optionsDezzer);
    responseDez.data.tracks.data.map(async (v, i) => {
      songs.push({ id: v.id, title: v.title, artist: { name: v.artist.name, id: v.artist.id }, img: v.album.cover });
    })
    res.send(songs);
  } catch (error) {
    res.send(error);
  }
})
app.get('/download/byYtId/:videoId', async (req, res) => {
  const videoId = req.params.videoId
  const videoUrl = `http://www.youtube.com/watch?v=${videoId}`
  try {
    const outputFileName = `${videoId}.mp3`; // Specify the desired output file name
    const outputPath = path.join(__dirname, outputFileName); // Get the absolute path for the output file

    await downloadAndConvertAudio(videoUrl, outputPath);

    res.sendFile(outputPath, (error) => {
      if (error) {
        console.error('Error sending audio file:', error);
        res.status(500).json({ error: 'Failed to send audio file' });
      } else {
        console.log('Audio file sent successfully');
        fs.unlinkSync(outputPath); // Delete the temporary output file
      }
    });
  } catch (error) {
    console.error('Error converting audio:', error);
    res.status(500).json({ error: 'Failed to convert audio' });
  }
});
app.get('/info/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  const info = (await ytdl.getInfo(`http://www.youtube.com/watch?v=${videoId}`)).videoDetails
  //let format = ytdl.chooseFormat(info.formats, { quality: '134' });
  res.send({ id: videoId, title: info.title, publishDate: info.publishDate, authorName: info.author.name, image: info.thumbnails[3].url })
});

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`)
})