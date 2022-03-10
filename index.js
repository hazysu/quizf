#!/usr/bin/node
const axios = require('axios')
const cheerio = require('cheerio')

async function getPageData(url) {
    let html = (await axios.get(url)).data
    const $ = cheerio.load(html)
    let scriptTags = $('script')
    const setPageDataString = `(function(){window.Quizlet["setPageData"] = `
    for (let i = 0; i < scriptTags.length; i ++) {
        let tagJs = $(scriptTags[i]).html()
        if (tagJs.startsWith(setPageDataString)) {
            let close = `; QLoad("Quizlet.setPageData");})`
            return JSON.parse(tagJs.replace(setPageDataString, '').split(close)[0]).termIdToTermsMap
        }
    }
}

async function searchDuckDuckGo(query) {
    let res = (await axios.get(`https://html.duckduckgo.com/html?q=${encodeURIComponent(query)}`)).data
    const $ = cheerio.load(res)
    let linkElems = $('h2.result__title > a.result__a')
    let links = []
    for (let i = 0; i < linkElems.length; i ++) {
        let url = linkElems[i.toString()].attribs.href.split('?uddg=')[1].split('&')[0]
        links.push(decodeURIComponent(url))
    }
    return links
}

async function findAnswerOnQuizlet(quizlet, question) {
    let pageDat = await getPageData(quizlet)
    let ids = Object.keys(pageDat)
    for (let i = 0; i < ids.length; i++) {
        if (pageDat[ids[i]].word.includes(question)) {
            let answer = pageDat[ids[i]]
            return {
                question: answer.word,
                answer: answer.definition
            }
        }
    }
}

async function getAnswer(question) {
    console.log(`Trying to answer: "${question}"`)
    console.log(`Searching for Quizlet quizzes...`)
    let results = await searchDuckDuckGo(`"${question}" site:quizlet.com`)
    if (results.length == 0) {
        console.log(`Found no results for this question, unfortunately.`)
        return
    }
    console.log(`Found a quiz! Searching for answer...`)
    let guess = await findAnswerOnQuizlet(results[0], question)
    console.log(`Found answer on Quizlet: "${guess.answer}"`)
}

let questionToAnswer = process.argv.slice(2).join(' ')

getAnswer(questionToAnswer)