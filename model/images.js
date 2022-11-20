const mongoose = require('mongoose')

const ImageSchema = new mongoose.Schema({
    email:String,
    imageName:String,
    imageLabel:String
}, {collection: 'images'})

const model = mongoose.model('ImageSchema', ImageSchema)
module.exports = model
