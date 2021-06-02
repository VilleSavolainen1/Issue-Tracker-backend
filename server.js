require("dotenv").config();
const express = require('express');
const cors = require('cors');
const app = express();
const knex = require('knex');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { removeAllListeners } = require("nodemon");


const db = knex({
    client: 'pg',
    connection: {
        host: process.env.PG_HOST,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE
    }
});

app.use(cors());
app.use(bodyParser.json());


app.post('/register', async (req, res) => {
    let { username, password } = req.body;
    try {
        await db.select().from('users').where('username', '=', username)
            .then(async data => {
                if (data.length > 0) {
                    res.status(400).send('Käyttäjä löytyy jo!');
                } else {
                    const hash = await bcrypt.hash(password, 10);
                    await db.transaction(trx => {
                        trx.insert({ username: username, password: hash })
                            .into('users')
                            .returning('username')
                            .then(loginName => {
                                return trx('login').insert({
                                    name: username,
                                    joined: new Date()
                                })
                                    .then(user => {
                                        res.json(user[0])
                                    })
                            })
                            .then(trx.commit)
                            .catch(trx.rollback)
                    })
                };
            })
    } catch (e) {
        console.log(e)
        res.status(500).send(e)
    }
})


app.post('/signin', (req, res) => {
    db.select('username', 'password').from('users')
        .where('username', '=', req.body.username)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].password);
            if (isValid) {
                return db.select('*').from('login')
                    .where('name', '=', req.body.username)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).send(err))
            } else {
                res.status(500).json("väärin")
            }
        })
        .catch(err => res.status(400).json(err))
})


//get all projects
app.get('/projects', async (req, res) => {
    try {
        await db.select('*').from('project')
            .then(project => {
                res.json(project.map(p => p))
            })
    } catch (e) {
        res.json(e)
    }
})


//update project status
app.post('/updatestatus', (req, res) => {
    let {id, status} = req.body;
    try {
        db('project').where('id', '=', id).update({status: status})
        .then(res => {
            console.log("updated")
        })
    }catch(e){
        console.log(e)
    }
    return res.json({status: 'ok'})
})


//create new project
app.post('/create', (req, res) => {
    let { name, type, description, assignee } = req.body
    try {
        db.insert({ name: name, type: type, description: description, assignee: assignee, status: false })
            .into('project')
            .then(res => {
                console.log("added")
            })
    } catch (e) {
        console.log(e)
    }
    return res.json({ status: 'ok' })
})

//delete project
app.post('/deleteproject', (req, res) => {
    let {name} = req.body;
    try {
        db.delete().from('project').where('name', '=', name)
        .then(res => {
            db.delete().from('list').where('project', '=', name)
            .then(res => {
                db.delete().from('issue').where('project', '=', name)
                console.log(res)
            })
            console.log("project deleted")
        })
    }catch(e) {
        console.log(e)
    }
    return res.json({status: 'ok'})
})


//add new list
app.post('/addlist', (req, res) => {
    let { name, project } = req.body;
    try {
        db.insert({ name: name, project: project })
            .into('list')
            .then(res => {
                console.log("list added")
            })
    } catch (e) {
        console.log(e)
    }
    return res.json({ status: 'ok' })
})

//delete list
app.post('/deletelist', (req, res) => {
    let { name, project } = req.body;
    try {
        db.delete().from('list').where('name', '=', name).andWhere('project', '=', project)
            .then(res => {
                console.log(res)
            })
    } catch (e) {
        console.log(e)
    }
    return res.json("list deleted")
})

//create issue
app.post('/createissue', (req, res) => {
    let { name, list, project } = req.body;
    try {
        db.insert({ name, list, project })
            .into('issue')
            .then(res => {
                console.log("added issue")
            })
    } catch (e) {
        console.log(e)
    }
    return res.json({ statue: 'issue created' })
})


//get lists...
app.get('/list', (req, res) => {
    try {
        db.select('*').from('list')
            .then(data => {
                res.json(data)
            })
    } catch (e) {
        console.log(e)
    }
})

//delete issue
app.post('/deleteissue', (req, res) => {
    let { name, list, project } = req.body;
    try {
        db.delete().from('issue').where('name', '=', name).andWhere('list', '=', list).andWhere('project', '=', project)
            .then(status => {
                res.json(status)
            }).catch(e => {
                res.json(e)
            })
    } catch (e) {
        res.json(e)
    }
})

//get issues
app.get('/issues', (req, res) => {
    try {
        db.select('*').from('issue')
            .then(data => {
                res.json(data)
            })
    } catch (e) {
        console.log(e)
    }
})



app.listen(process.env.port, () => console.log("server started"));