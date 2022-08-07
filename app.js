const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const xlsx = require("xlsx");
const alert = require("alert");

const session = require("express-session");
const passport = require("passport");
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");


const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "hebsecret",
  resave: false,
  saveUninitialized: false
}));

mongoose.connect("mongodb://localhost:27017/hebDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  nome: String,
  password: String,
  changepassword: Boolean
});

userSchema.plugin(passportLocalMongoose);

app.use(passport.initialize());
app.use(passport.session());

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  req.session.errorMessage = "";
  if (req.isAuthenticated()){
    res.redirect("/dados");
  }else res.render("index", {mensagem: ""});
});

app.post("/", (req, res)=>{
  let username = req.body.nome.toUpperCase();
  req.session.nomeCompleto = username;

  User.findOne({nome: username}, (err, foundUser)=>{
    if (err){
      console.log(err);
    }
    else{
      if (foundUser === null){
        res.render("index", {mensagem: "Nome não encontrado na base de dados!"});
      } else if (foundUser.changepassword === true){
        res.redirect("/register");
      }else{
        res.redirect("/login");
      }
    }
  })
});

app.get("/register", (req, res)=>{
  if ( (req.session.nomeCompleto) && (req.session.nomeCompleto !== "") ) {
    res.render("register", {nomeCompleto: req.session.nomeCompleto, mensagem: req.session.errorMessage});
  } else {
    res.redirect("/")
  }
});

app.post("/register", (req, res)=>{
  let senha = req.body.senha;
  let confirma = req.body.confirma;

  if (senha === confirma){
    User.findOne({nome: req.session.nomeCompleto}, (err, foundUser)=>{
      foundUser.password = senha;
      foundUser.changepassword = false;
      foundUser.save();
      res.redirect("/dados")
    //   foundUser.setPassword(senha, (err)=>{
    //     if (!err){
    //       // foundUser.changepassword = false;
    //       foundUser.password = senha;
    //       foundUser.save();
    //       console.log("password changed = false");
    //     } else {
    //       console.log("Password dado: " + senha);
    //       console.log(err);
    //     }
    //   });
    //
    //   console.log(req);
    //
    //   req.login(foundUser, (err)=>{
    //   if (err){
    //     console.log(err);
    //   } else{
    //     passport.authenticate("local")(req, res, () => {
    //
    //       res.redirect("/dados");
    //     })
    //   }
    // })
    })
  } else {
    req.session.errorMessage = "*As senhas informadas não conferem!"
    res.redirect("/register");
  }
});

app.get("/login", (req, res)=>{
  if ( (req.session.nomeCompleto) && (req.session.nomeCompleto !== "") ) {
    res.render("login", {nomeCompleto: req.session.nomeCompleto, mensagem: req.session.errorMessage});
  } else {
    res.redirect("/");
  }

});

app.post("/login", (req, res)=>{
  let senha = req.body.senha;

  User.findOne({nome: req.session.nomeCompleto}, (err, foundUser)=>{
    if (err){
      console.log(err);
    } else {
      if (senha === foundUser.password){
        res.redirect("/dados");
      } else {
        req.session.errorMessage = "Senha Incorreta"
        res.redirect("/login");
      }
    }
  });
});


app.get("/dados", (req, res)=>{
  if ( (req.session.nomeCompleto) && (req.session.nomeCompleto !== "") ) {
    var workbook = xlsx.readFile(__dirname + '/folha2.xlsx');
    var sheet_name_list = workbook.SheetNames;
    var xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

    var dadosFunc = [];

    xlData.forEach((data, i) => {
      if (data.FUNCIONARIO === req.session.nomeCompleto){
        dadosFunc = data;
      }
    });

    res.render("dados", {nomeCompleto: req.session.nomeCompleto, items: dadosFunc});
  } else {
    res.redirect("/");
  }
})


app.listen(3000, (req, res)=>{
  console.log("Server is listening on port 3000");
})
