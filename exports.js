const mongoose = require("mongoose");

const exportSchema = new mongoose.Schema(
    {
        _id: String,
        domain: String,
        expiryDate: String,
        fileName: String,
        avaliable: Boolean,
    },
    { collection: "exportdata" }
);

module.exports = mongoose.model("exportdata", exportSchema);