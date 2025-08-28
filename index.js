const express = require('express');
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post")
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt');

app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const bcrpt = require('bcrypt');

app.get('/',(req,res)=>{
    res.render('index');
});

app.post('/register',async(req,res)=>{
    let {username,email, name ,password,age}=req.body;
    let user = await userModel.findOne({email});
    if(user) return res.status(500).send('user already exist');

    bcrpt.genSalt(10,(err,salt)=>{
        bcrpt.hash(password ,salt,async(err,hash)=>{
         let user= await userModel.create({
                username,
                email,
                age,
                name,
                password:hash
            });
            let token = jwt.sign({email:email,userid: user._id},"shhhhh");
            res.cookie("token",token);
            res.redirect("/profile");
        })
    })     
});

app.get('/profile',isLoggedIn,async(req,res)=>{
    let user = await userModel.findOne({email:req.user.email}).populate("posts");
    res.render('profile',{user:user});
})

app.get('/like/:id',isLoggedIn,async(req,res)=>{
    let post = await postModel.findOne({_id:req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid)===-1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice((post.likes.userid),1);
    }
    await post.save();
    res.redirect('profile');
})

app.get('/edit/:id',isLoggedIn,async(req,res)=>{
    let post = await postModel.findOne({_id:req.params.id}).populate("user");
    
    res.render('edit',{post});
})

app.get('/login',(req,res)=>{
    res.render('login');
});

app.post('/login',async(req,res)=>{
    let {email ,password}=req.body;
    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send('Somthing went worng');

    bcrpt.compare(password,user.password,(err,result)=>{
        if(result) { 
            
            let token = jwt.sign({email:email,userid: user._id},"shhhhh");
            res.cookie("token",token);
            res.status(200).redirect('/profile');
        }
        else res.redirect('/login');
    })
})

app.get('/logout',async(req,res)=>{
    res.clearCookie("token");
    res.redirect('/login');
});
app.post('/post',isLoggedIn,async(req,res)=>{
    let user = await userModel.findOne({email:req.user.email});
    let{content}=req.body;

    let post= await postModel.create({
        user:user._id,
        content:content,
    })
    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
})

function isLoggedIn(req,res,next){
    if(req.cookies.token=="") res.send("You must be logged in");
    else{
        let data = jwt.verify(req.cookies.token,"shhhhh");
        req.user=data;
    }
    next();
}

app.listen(3000);