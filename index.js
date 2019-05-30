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
    let duplicate = await storage.getItem(proposal) // dont tweet about same proposal twice
    if (!duplicate) {
        //tweetUpdate(tweetBody) dont actually tweet while testing
        console.log(tweetBody)
        setStorage(proposal, true)

    } else {
        console.log("ignoring already tweeted proposal:" + proposal)
    }

}

function safelyParseDetails(details) {
    try {
        return JSON.parse(details)
    } catch (e) {

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

function truncateTweet(s, n) {
    return (s.length > n) ? s.substr(0, n - 1) + '...' : s
};

const poll = async function () {

    initStorage()

    var latestTweetedProposal = await storage.getItem('last_tweet_id') || 0
    latestTweetedProposal = 0 // for debug only to force tweet body creation
    axios.post(url, { //get all proposals in reverse order that have not been aborted or processed
            query: "{proposals(orderBy: timestamp, orderDirection: desc, where: { aborted: false,processed: false}) {id, timestamp, details, aborted}}"

        })
        .then((res) => {

            var myProposals = res.data["data"]["proposals"]
            for (let key in myProposals) {
                let proposal = myProposals[key]
                parsedDetails = safelyParseDetails(proposal.details)

                if ((parsedDetails) && parseInt(proposal.id) > latestTweetedProposal) {
                    latestTweetedProposal = proposal.id
                    setStorage('last_tweet_id', latestTweetedProposal)

                    tweetBody = `MolochDAO Proposal ${proposal.id} is now in queue.\n`
                    tweetBody += `https://molochdao.com/proposals/${proposal.id}\n`

                    if (parsedDetails.title) {
                        tweetBody += `${parsedDetails.title}\n`
                    }

                    if (parsedDetails.description) {
                        tweetBody += `${parsedDetails.description}\n`
                    }

                    safeTweet(truncateTweet(tweetBody, 275), proposal.id)
                }
            }
        })
        .catch((error) => {
            console.error(error)
        })


}
// Poll Once and quit.
poll();