var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var axios = require("axios");
var moment = require('moment');
var CoinMarketCap = require("node-coinmarketcap");
var coinmarketcap = new CoinMarketCap();
var _ = require('underscore')._;
global.fetch = require('node-fetch');
const cc = require('cryptocompare');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

server.post('/api/messages', connector.listen());

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })

.matches('Greeting', (session) => {
    session.send("You reached the bitcoin bot made by Microsoft Student Partners at Queen's, you said \'%s\'.'", session.message.text);
})
.matches('GetPrice', (session) => {
    coinmarketcap.get("bitcoin", coin => {
        session.send("Here is today's price of bitcoin in USD %d", coin.price_usd); // Prints the price in USD of BTC at the moment.
});
})

.matches('News', (session) => {
    axios.get("https://newsapi.org/v2/top-headlines?sources=crypto-coins-news&apiKey=f7fc98b4018c4303b6ba7af02dc414f7")
        .then(response => {
            var articles = response['data']['articles']
            for (i = 0; i < 3; i++) {
                    session.send(" \"" + articles[i]['title'] + "\"  : " + articles[i]['description'] + " - " + articles[i]['url']);
            }
      })
      .catch(error => {
        console.log(error);
      });
})

.matches('Help', (session) => {
    session.send('You reached Help intent, you said \'%s\'.', session.message.text);
})
.matches('Cancel', (session) => {
    session.send('You reached Cancel intent, you said \'%s\'.', session.message.text);
})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);    

