const path = require('path')
const express = require('express')
const fetch = require('node-fetch')
const RSSParser = require('rss-parser')
const cheerio = require('cheerio')
const axios = require('axios')

const app = express()
const { getTarget } = require('./lib/airtable')

const send404Page = (response) => {
  return response
    .status(404)
    .sendFile(path.join(__dirname, './public', '404.html'))
}

app.get('/', async (req, res) => {
  try {
    return res.redirect(302, process.env.MAIN_DOMAIN)
  } catch (e) {
    console.error(e)
  }
})

const classToIFrameIndex = [
  { classes: [10, 11, 12], index: 0 },
  { classes: [8, 9], index: 1 },
  { classes: [6, 7], index: 2 },
]
const FEED_URL = 'https://dpsrkp.net/category/notices/feed/'

app.get('/:userClass/tt', async (req, res) => {
  const { userClass } = req.params
  if (
    !classToIFrameIndex.flatMap((i) => i.classes).includes(parseInt(userClass))
  )
    return res.status(400).send('eg. 11/tt')
  try {
    const parser = new RSSParser()
    const articleLink = (await parser.parseURL(FEED_URL)).items
      .map(({ title, link }) => ({ title, link }))
      .find(
        (item) =>
          item.title.includes('SCHEDULE') && item.title.includes('SESSION')
      ).link

    const { data } = await axios.get(articleLink)

    const $ = cheerio.load(data)

    const { index } = classToIFrameIndex.find((obj) =>
      obj.classes.includes(parseInt(userClass))
    )

    console.log(index)
    const link = $('iframe')[index].attribs.src
    res.redirect(link)
  } catch (e) {
    res.status(400).send(`An error occured: ${e}`)
  }
})

// GitHub projects
app.get('/gh/:repo', async (req, res) => {
  try {
    const { repo } = req.params
    const { GITHUB_USERNAME: ghUsername } = process.env

    const { ok: repoExists } = await fetch(
      `https://api.github.com/repos/${ghUsername}/${repo}`
    )

    if (repoExists) {
      return res.redirect(302, `https://github.com/${ghUsername}/${repo}`)
    }

    // Redirect if not found
    //return res.status(404).send('404')
    send404Page(res)
  } catch (e) {
    console.error(e)
  }
})

// Main slugs
app.get('/*', async (req, res) => {
  try {
    const slug = req.originalUrl.substring(1)
    const target = await getTarget(slug)

    if (target) {
      return res.redirect(302, target)
    }

    //return res.status(404).send('404')
    //return res
    //.status(404)
    //.sendFile(path.join(__dirname, './public', '404.html'))
    send404Page(res)
  } catch (e) {
    console.error(e)
  }
})

const port = process.env.PORT || 3000
app.listen(port, (err) => {
  console.log(`Shortener listening on ${port}!`)
  if (err) throw err
})
