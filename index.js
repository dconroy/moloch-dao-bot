const axios = require('axios')
const twitterClient = require("./social/twitter")
const storage = require('node-persist');

const url = 'https://api.thegraph.com/subgraphs/name/molochventures/moloch'

const initStorage = async function () {
    await storage.init({
        dir: 'persist',
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: 'utf8',
        forgiveParseErrors: false
    })
}

const setStorage = async function (key, value) {
    return storage.setItem(key, value)
}

const safeTweet = async function (tweetBody, proposal) {
    let duplicate = await storage.getItem(proposal)
    if (!duplicate) {
        tweetUpdate(tweetBody)
        console.log(tweetBody)
        markProposalTweeted(proposal)
    
    } else {
        console.log("ignoring already tweeted proposal:" + proposal)
    }

}

const markProposalTweeted = async function (proposal) {
    return setStorage(proposal, true)
}


const start = async function (a, b) {

    initStorage()

    var latestTweet = await storage.getItem('last_tweet_id') || 0;

    axios.post(url, {
             query: "{proposals(orderBy: timestamp, orderDirection: desc, where: { aborted: false,processed: false}) {id, timestamp, details, aborted}}"

        })
        .then((res) => {

            var myProposals = res.data["data"]["proposals"]
            for (let key in myProposals) {
                let value = myProposals[key]
                parsedDetails = safelyParseDetails(value.details)

                if ((parsedDetails) && parseInt(value.id) > latestTweet) {
                    latestTweet = value.id
                    setStorage('last_tweet_id', latestTweet)

                    tweetBody = `MolochDAO Proposal ${value.id} is now live.\n`
                    tweetBody += `https://molochdao.com/proposals/${value.id}\n`

                    if (parsedDetails.title) {
                        tweetBody += `${parsedDetails.title}\n`
                    }

                    if (parsedDetails.description) {
                        tweetBody += `${parsedDetails.description}\n`
                    }
                
                    
                    safeTweet(truncater(tweetBody, 275), value.id)

                }
            }


        })
        .catch((error) => {
            console.error(error)
        })




}

function safelyParseDetails(details) { //details = JSON.stringify(details)

    try {

        return JSON.parse(details)
    } catch (e) {

        //console.log(e)
    }

    return null
}


function tweetUpdate(update) {
    twitterClient.post('statuses/update', {
        status: update
    }, (err, tweet, res) => {
        if (err) console.log(err)
        console.log(tweet)
        console.log(res)
    });
}

function truncater(s, n) {
    return (s.length > n) ? s.substr(0, n - 1) + '...' : s;
};

// Call start
start();