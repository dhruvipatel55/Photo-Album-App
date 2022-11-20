const multer = require("multer")
var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "userFiles/");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  }
})
var upload = multer({storage:Storage});
const express = require("express");
const app = express();
var pathe = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const User = require("./model/user");
const ImageModel = require("./model/images")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var fs = require('fs');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});



const JWT_SECRET = "spoekgfsfpdkgjrqeop'tgtkl;fsdk0qi40594q30r@O!@#)(@!$_)Iakdfl;ad";

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);


app.use(express.static(pathe.join(__dirname, "public")));
app.use('/userFiles', express.static("./userFiles"));

mongoose.connect("mongodb://localhost:27017/AuthAppDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  res.render("Login");
});

const authenticator = async function (req, res, next) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.json({ status: "not Authenticated, token was not recieved" });
    } else {
      const user = jwt.verify(token, JWT_SECRET);
      if (!user) {
        return res.json({ status: "not Authenticated" });
      }
      req.user = user;
      next();
    }
  } catch (error) {
    return res.json({ status: "not Authenticated" });
  }
};

app.post("/DisplayInfo", authenticator, async (req, res) => {
  res.json({ status: "ok", data: req.user });
});


app.get("/Dashboard", async (req, res) => {
  res.render("Dashboard");
});

app.post("/GetImages", authenticator, async (req,res) =>{
  try {
    const response = await ImageModel.find({
      email: req.user.email
    });
    return res.json({ status: "ok", data: response });
  } catch (error) {
    return res.json({ status: "error", data: "Failed" });
  }
})

app.post("/galleryApp/DeleteImage", authenticator, async (req,res) =>{
  const imageID = req.body.imageID;
  try{
      const deleteimage = await ImageModel.findByIdAndDelete({ _id: imageID });
      var imagePath = "./userFiles/"+deleteimage.imageName
      fs.unlinkSync(imagePath)
      return res.json({ status: "ok", data: "image deleted" });
  }
  catch (error) {
    return res.json({ status: "ok", data: "Failed" });
  }
})

app.post("/galleryApp/searchByLabel", authenticator, async (req, res) => {
  try {
    const response = await ImageModel.find({
      email: req.user.email,
      imageLabel: req.body.search,
    });
    return res.json({ status: "ok", data: response });
  } catch (error) {
    return res.json({ status: "ok", data: "Failed" });
  }
});

app.post("/galleryApp/upload", upload.array("files"), uploadFiles);


function uploadFiles(req, res){
  console.log(req.body.ImageName);
  console.log(req.files);
  const token = req.body.token
  const user = jwt.verify(token, JWT_SECRET)
  if(!user)
  {
    return res.json({message: "unAuthenticated"});
  }
  req.user = user
  req.files.forEach(file => {
    var imageDetails = new ImageModel({
      email: req.user.email,
      imageName: file.filename,
      imageLabel: req.body.ImageName
    })
    imageDetails.save(function(err, doc){
      if(err) throw err;
    })
  });
  res.json({message: "Successfully uploaded files"});
}

app.post("/galleryApp/changeImage", upload.array("files"), changeFiles);


async function changeFiles(req, res){
  var imageID = req.body.imageIDtoChange
  const token = req.body.token
  var imageN
  const user = jwt.verify(token, JWT_SECRET)
  if(!user)
  {
    return res.json({message: "unAuthenticated"});
  }
  req.user = user
  req.files.forEach(file => {
    imageN = file.filename
  })

  const getImageName = await ImageModel.findById({
    _id: imageID
  })

  console.log("Name of Image:" + getImageName.imageName)
  var imagePath = "./userFiles/"+getImageName.imageName
  fs.unlinkSync(imagePath)

  const updateImage = await ImageModel.findByIdAndUpdate(
    { _id: imageID },
    { imageName: imageN }
  );
  return res.json({message: "Successfully changed files"});
}





app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.json({ status: "error", error: "Invalid username" });
    }
    if (await bcrypt.compare(password, user.password)) {
      //email password combination successful
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          email: user.email,
          phonenumber: user.phonenumber,
          bday: user.bday,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      return res.json({ status: "ok", data: token });
    }
    return res.json({ status: "error", error: "Invalid password" });
  } catch (error) {
    return res.json({ status: "ok", data: "Failed" });
  }
});

app.get("/Register", (req, res) => {
  res.render("Register");
});

app.post("/signup", async (req, res) => {
  const {
    username,
    email,
    password: plainTextPassword,
    bday,
    phonenumber,
  } = req.body;

  if (!username || typeof username != "string") {
    return res.json({ status: "error", error: "Invalid Username" });
  }

  if (!email || typeof email != "string") {
    return res.json({ status: "error", error: "Invalid email" });
  }

  if (!plainTextPassword || typeof plainTextPassword != "string") {
    return res.json({ status: "error", error: "Invalid password" });
  }

  if (!bday || typeof bday != "string") {
    return res.json({ status: "error", error: "Invalid password" });
  }

  if (!phonenumber || typeof phonenumber != "string") {
    return res.json({ status: "error", error: "Invalid password" });
  }

  if (plainTextPassword.length < 5) {
    return res.json({
      status: "error",
      error: "Password too small. Should be atleast 6 characters long",
    });
  }

  const password = await bcrypt.hash(plainTextPassword, 10);

  try {
    const response = await User.create({
      username,
      email,
      password,
      bday,
      phonenumber,
    });
  } catch (error) {
    if (error.code === 11000) {
      //duplicate key
      return res.json({ status: "error", error: "Email already in use" });
    }
    throw error;
  }
  res.json({ status: "ok" });
});

app.get("*", function (req, res) {
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("App started on port 3000");
});
