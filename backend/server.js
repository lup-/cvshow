const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const multer = require('koa-multer');

const cvs = require('./routes/cvs');
const users = require('./routes/users');

const PORT = 3000;
const HOST = '0.0.0.0';

const app = new Koa();
const router = new Router();
const upload = multer({});

router
    .post('/api/cv/get', cvs.get)
    .post('/api/cv/list', cvs.list)
    .post('/api/cv/add', cvs.add)
    .post('/api/cv/update', cvs.update)
    .post('/api/cv/delete', cvs.delete)
    .post('/api/cv/resume', upload.single('file'), cvs.resume);

router
    .post('/api/user/list', users.list)
    .post('/api/user/add', users.add)
    .post('/api/user/update', users.update)
    .post('/api/user/delete', users.delete)
    .post('/api/user/check', users.check)
    .post('/api/user/login', users.login);

app
    .use(bodyParser({
        formLimit: '50mb',
        jsonLimit: '1mb',
    }))
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(PORT, HOST);