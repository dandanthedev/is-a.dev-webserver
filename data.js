const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        domain: String,
        HashedPassword: String,
        HashPagePassword: String,
        FTP: Boolean,
        EMAIL: Boolean,
        ACTIVATED: Boolean,
        ACTIVATION_CODE: String,
        ACTIVATION_EMAIL: String,
        storageUsed: String,
    },
    { collection: "hostingdata" }
);

module.exports = mongoose.model("hostingdata", userSchema);