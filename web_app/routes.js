const crypto = require("crypto");
var mongojs = require('mongojs');
const { SkynetClient } = require('@nebulous/skynet');


module.exports = function(app, passport){

  var uri = 'your-mongodb-uri';

  var ObjectId = require('mongojs').ObjectID;
  
  var db1 = mongojs(uri, ['users']);

  var StellarSdk = require('stellar-sdk');
  const server = new StellarSdk.Server('https://horizon.stellar.org')
  StellarSdk.Network.usePublicNetwork()

  const destination = StellarSdk.Keypair.random()

  app.get('/', function(req, res){
    
      res.render('index.html');
    
  });


  app.get('/login', function(req, res){
    
      res.render('login.html');
    
  });


  //MAIN WALLET PAGE
  app.get('/infinID', isLoggedIn, function(req, res){

     res.render('infinid-wallet.html');

  });

  
  // New Walkercoin test page
  app.get('/transactions', isLoggedIn, function(req, res){
    
         res.render('walkercoin-transactions.html');
    
  });
  

  //SIGNUP route
  app.post('/signup', passport.authenticate('local-signup', {
    
      successRedirect: '/login',
      failureRedirect: '/',
      failureFlash: true
    
  }));


  //LOGIN route
  app.post('/login', passport.authenticate('local-login', {
    
       successRedirect: '/infinID',
       failureRedirect: '/login',
       failureFlash: true
    
  }));


  //LOGOUT route
  app.get('/logout', function(req, res){
    
        req.logout();
        res.redirect('/login');
    
  });


 //Getting user object into authenticated pages
 app.get('/user', isLoggedIn, function(req, res){
  
      res.send(req.user);
  
 });

  
  //isLoggedIn middleware
  function isLoggedIn(req, res, next){
    
       if(req.isAuthenticated())
         return next();
    
       res.redirect('/login');
    
   }


   //Check Balance Route for Chatbot
   app.post('/balance', function(req, res){

      var phonenum = req.body.phone;

      //var id = req.user._id.toString();
      var query = {"local.phone": phonenum};  

      
      db1.users.find(query, function(err, docs){
        
          // console.log(docs);
          //res.send(docs);     
      
          const request = require('request');
          request('https://horizon.stellar.org/accounts/' + docs[0].local.key0, function (error, response, body) {
            var data = JSON.parse(body);
            if (!error && response.statusCode == 200) {
              console.log('\nXLM Balance: ' + data.balances[0].balance);
              balance = {'balance': data.balances[0].balance}
              res.send(balance)  
            }                       
          });         
      
       });

   });


   //Send XLM to recipient
   app.post('/sendXLM', function(req, res){
     
        var phonenum = req.body.phone
        var destination_pub = req.body.address;
        var amt = req.body.amount;
        var password = req.body.pin;

        var query = {"local.phone": phonenum};

        db1.users.find(query, function(err, docs){

              if(err){
                res.send('No matching account for phone number ' + phonenum);
              }

              console.log(docs)

              var secret = docs[0].local.key1;

              console.log(password)
                     
              var source = StellarSdk.Keypair.fromSecret(secret);                
        
              server.accounts()
              .accountId(source.publicKey())
              .call()
              .then(({ sequence }) => {
                const account = new StellarSdk.Account(source.publicKey(), sequence)
                const transaction = new StellarSdk.TransactionBuilder(account, {
                  fee: StellarSdk.BASE_FEE
                })
                  .addOperation(StellarSdk.Operation.payment({
                    destination: destination_pub,
                    asset: StellarSdk.Asset.native(),
                    amount: amt
                  }))
                  .setTimeout(30)
                  .build()
                transaction.sign(StellarSdk.Keypair.fromSecret(source.secret()))
                //console.log('Running Transaction...')
                return server.submitTransaction(transaction)
              })
              .then(results => {
                console.log('Transaction', results._links.transaction.href)
                res.send({'message':'Transaction Successful!'});
                //console.log('New Keypair', destination.publicKey(), destination.secret())
              })

        })
  
    });


   //Check Balance Route
   app.get('/checkBalance', isLoggedIn, function(req, res){
    
        var id = req.user._id.toString();
        var query = {"_id": ObjectId(id)};  
        
        db1.users.find(query, function(err, docs){
          console.log(docs)
          const request = require('request');
          request('https://horizon.stellar.org/accounts/' + docs[0].local.key0, function (error, response, body) {
            var data = JSON.parse(body);
            if (!error && response.statusCode == 200) {
              console.log('\nXLM Balance: ' + data.balances[0].balance);
              // balance = {'balance': data.balances[0].balance}
              res.send(data.balances[0].balance || 0.0)
            }
          }); 
        });   
    
    });


  //Skynet Route
  /* app.get('/skynet', function(req, res){
        
        // create a client
        
        const client = new SkynetClient();        
        
        (async () => {
        
          // upload        
          const skylink = await client.uploadFile("./public/images/infinID-logo.png");        
          console.log(`Upload successful, skylink: ${skylink}`);
        
        
          // download        
          await client.downloadFile("./logo.png", skylink);        
          console.log('Download successful');

          res.send(skylink)
        
        })()
  }); */

  
};
