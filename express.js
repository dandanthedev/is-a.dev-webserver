require('dotenv').config()

const express = require('express')
const session = require('express-session')

const app = express()
const port = 3000

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


const fs = require('fs');
app.get('*', async(req, res) => {
    try{

    //Domain variable
    let domain = req.headers.host;
    domain = domain.split(':')[0];

    //Check if the domain exists
    if(!fs.existsSync(`content/${domain}`)) 
        return res.status(404).sendFile(__dirname + '/404.html');
    
    //Load config
    let config = fs.readFileSync(__dirname + `/content/${domain}/config.json`);
    config = JSON.parse(config);

    //Password protection
    if(config.password &&
         typeof req.session.authenticated == 'undefined' ||
         !req.session.authenticated.includes(domain)) return res.sendFile(__dirname + '/login.html');
    
    //Get file
    let file = req.url;
    if(file == '/') file = 'index.html';
    if(file.includes('..')) return res.status(403).sendFile(__dirname + '/403.html');
    if(file.startsWith('/')) file = file.substring(1);

    //Check if file exists
    let path = `content/${domain}/${file}`;
    if(!fs.existsSync(path)){
        //if custom 404 exists, send it, else send default
        if(fs.existsSync(`${domain}/404.html`)) return res.status(404).sendFile(`${domain}/404.html`);
        return res.status(404).sendFile(__dirname + '/404.html');
    }

    //Serve file
    return res.sendFile(__dirname + '/' + path);

   
}catch(err){
    console.log(err);
        return res.status(500).sendFile(__dirname + '/500.html');
    }
})
app.post('*', (req, res) => {
    try{
    let domain = req.headers.host;
    domain = domain.split(':')[0];
    console.log(domain);
    //check if directory content/host exists
    if(!fs.existsSync(`content/${domain}`)) return res.status(404).sendFile(__dirname + '/404.html');
    let config = fs.readFileSync(__dirname + `/content/${domain}/config.json`);
    config = JSON.parse(config);
    
    if(config.password && req.body.password != config.password) return res.sendFile(__dirname + '/login.html');
    if(typeof req.session.authenticated == 'undefined') req.session.authenticated = [];
    req.session.authenticated.push(domain);
    //redirect to same url with get
    return res.redirect(req.url);

    }catch(err){
        console.log(err);
        return res.status(500).sendFile(__dirname + '/500.html');
    }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})