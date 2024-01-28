const express = require("express");
const bodyParser = require("body-parser");
const Botly = require("botly");
const botly = new Botly({
    accessToken: pageAccessToken, // page access token provided by facebook
    verifyToken: verificationToken, // needed when using express - the verification token you provided when defining the webhook in facebook
    webHookPath: yourWebHookPath, // defaults to "/",
    notificationType: Botly.CONST.REGULAR, // already the default (optional)
    FB_URL: 'https://graph.facebook.com/v2.6/' // this is the default - allows overriding for testing purposes
});
 
botly.on("message", (senderId, message, data) => {
    
 
    botly.sendText({
      id: senderId,
      text:"مرحبا بك في بوت الالغاز",
    });
});
 
const app = express();
app.use(bodyParser.json({
    verify: botly.getVerifySignature(process.env.APP_SECRET) //allow signature verification based on the app secret
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/webhook", botly.router());
app.listen(3000);