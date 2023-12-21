const cron = require('node-cron');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Connect to MongoDB
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const dbName = process.env.DATABASE_NAME || 'your_database_name';

mongoose.connect(uri + "hosting-links", { useNewUrlParser: true, useUnifiedTopology: true });

const LinkExpiration = mongoose.model('LinkExpiration', {
    domain: String,
    fileName: String,
    linkId: String,
    expiration: Date,
});

// Middleware to check expiration
const checkLinkExpiration = async (req, res, next) => {
    const domain = req.params.domain;
    const linkId = req.params.linkId;

    try {
        const link = await LinkExpiration.findOne({ linkId });
        consle.log(linkId + " " + link.domain);
        if (!link || link.domain !== domain) {
            return res.status(403).send('Forbidden');
        }
        if (!link || link.expiration < new Date()) {
            return res.status(403).sendFile(__dirname + "/expired.html");
        }
        req.fileName = link.fileName;
        next();
    } catch (error) {
        console.error('Error checking link expiration:', error);
        res.status(500).send('Internal Server Error');
    }
};



// Endpoint to generate an expiring link
async function generateLink(domain, fileName) {
    try {
        const linkId = generateLinkId(); // Generate a unique link identifier
        const expiration = new Date(Date.now() + (24 * 60 * 60 * 1000)); // Link expires in 24 hours

        try {
            await LinkExpiration.create({ domain, fileName, linkId, expiration });
            console.log('Link saved successfully.');
        } catch (error) {
            console.error('Error saving link:', error);
        }

        const link = `https://hosts.is-a.dev/api/protected/${domain}/${linkId}`;
        return link;
    } catch (error) {
        console.error('Error generating link:', error);
        return null;
    }
};

// Schedule the cron job to run every hour
cron.schedule('0 * * * *', async () => {
    try {
        const currentTime = new Date();
        //remove links that have expired and delete the files
        const links = await LinkExpiration.find({ expiration: { $lt: currentTime } });
        for (const link of links) {
            const filePath = path.join(__dirname, 'archive/', link.fileName);
            fs.unlinkSync(filePath);
        }
        await LinkExpiration.deleteMany({ expiration: { $lt: currentTime } });
        console.log('Expired links removed.');
    } catch (error) {
        console.error('Error removing expired links:', error);
    }
});



// Helper function to generate a unique link identifier
function generateLinkId() {
    // Implement your logic to generate a unique link ID
    // For simplicity, you can use a random string or a timestamp-based value
    return Math.random().toString(36).substring(7);
}

module.exports = { generateLink, checkLinkExpiration };
