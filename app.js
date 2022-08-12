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
  changepassword: Boolean,
  clt_numero: String,
  clt_serie: String,
  cpf: String,
  pis: String
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
  let _cpf = req.body.cpf;
  req.session.cpf = _cpf;

  console.log("cpf: " + _cpf);
  // let username = req.body.nome.toUpperCase();
  // req.session.nomeCompleto = username;

  User.findOne({cpf: _cpf}, (err, foundUser)=>{
    if (err){
      console.log(err);
    }
    else{
      if (foundUser === null){
        res.render("index", {mensagem: "CPF não encontrado na base de dados! Tente novamente"});
      } else {
        req.session.nomeCompleto = foundUser.nome;
        if (foundUser.changepassword === true){
          res.redirect("/register");
        }else{
          res.redirect("/login");
        }
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
  var clt = req.body.clt;
  var pis = req.body.pis;

  User.findOne({cpf: req.session.cpf}, (err, foundUser)=>{
    console.log(clt);
    console.log(foundUser);
    if (foundUser.clt_numero !== clt){
      req.session.errorMessage = "*Número da carteira de trabalho não encontrado!"
      res.redirect("/register");
    } else if (foundUser.pis !== pis) {
      req.session.errorMessage = "*Número do PIS não encontrado!"
      res.redirect("/register");
    } else if (senha !== confirma){
      req.session.errorMessage = "*Senhas não conferem!"
      res.redirect("/register");
    } else {
      foundUser.password = senha;
      foundUser.changepassword = false;
      foundUser.save();
      res.redirect("/dados")
    }
  })

  // if (senha === confirma){
  //   User.findOne({nome: req.session.cpf}, (err, foundUser)=>{
  //     foundUser.password = senha;
  //     foundUser.changepassword = false;
  //     foundUser.save();
  //     res.redirect("/dados")
  //   })
  // } else {
  //   req.session.errorMessage = "*As senhas informadas não conferem!"
  //   res.redirect("/register");
  // }
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
