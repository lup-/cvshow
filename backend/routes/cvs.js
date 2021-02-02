const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');
const {parseFile} = require('../modules/Resume');

const COLLECTION_NAME = 'cvs';
const ITEM_NAME = 'cv';
const ITEMS_NAME = 'cvs';

function transliterate(str) {
    let ttable = {"Ё":"YO","Й":"I","Ц":"TS","У":"U","К":"K","Е":"E","Н":"N","Г":"G","Ш":"SH","Щ":"SCH","З":"Z","Х":"H","Ъ":"'","ё":"yo","й":"i","ц":"ts","у":"u","к":"k","е":"e","н":"n","г":"g","ш":"sh","щ":"sch","з":"z","х":"h","ъ":"'","Ф":"F","Ы":"I","В":"V","А":"a","П":"P","Р":"R","О":"O","Л":"L","Д":"D","Ж":"ZH","Э":"E","ф":"f","ы":"i","в":"v","а":"a","п":"p","р":"r","о":"o","л":"l","д":"d","ж":"zh","э":"e","Я":"Ya","Ч":"CH","С":"S","М":"M","И":"I","Т":"T","Ь":"'","Б":"B","Ю":"YU","я":"ya","ч":"ch","с":"s","м":"m","и":"i","т":"t","ь":"'","б":"b","ю":"yu"};

    return str.split('').map(function (char) {
        return ttable[char] || char;
    }).join("");
}
async function getSlug(cv) {
    let slug = transliterate(cv.name)
        .replace(/[^a-z ]+/gi, '')
        .toLowerCase()
        .trim()
        .split(' ')
        .map((name, index) => index === 0 ? name : name[0])
        .filter((val, index) => index < 3)
        .join('');

    let db = await getDb();
    let items = await db.collection(COLLECTION_NAME).find({slug}).toArray();
    if (items.length > 0) {
        slug += items.length.toString().padStart(2, '0');
    }

    return slug;
}

module.exports = {
    async get(ctx) {
        let slug = ctx.request.body && ctx.request.body.slug
            ? ctx.request.body.slug || false
            : false;

        let query = {
            slug,
            'deleted': {$in: [null, false]}
        };

        let db = await getDb();
        let item = await db.collection(COLLECTION_NAME).findOne(query);
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    },
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};

        let defaultFilter = {
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb();
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();
        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async add(ctx) {
        let itemFields = ctx.request.body[ITEM_NAME];
        if (!itemFields.slug) {
            itemFields.slug = await getSlug(itemFields);
        }

        if (itemFields._id) {
            let response = {};
            response[ITEM_NAME] = false;

            ctx.body = response;
            return;
        }

        itemFields = Object.assign(itemFields, {
            id: shortid.generate(),
            created: moment().unix(),
            updated: moment().unix(),
        });

        const db = await getDb();
        let result = await db.collection(COLLECTION_NAME).insertOne(itemFields);
        let item = result.ops[0];
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    },
    async update(ctx) {
        const db = await getDb();

        let itemFields = ctx.request.body[ITEM_NAME];
        let id = itemFields.id;

        if (itemFields._id) {
            delete itemFields._id;
        }

        itemFields = Object.assign(itemFields, {
            updated: moment().unix(),
        });

        let updateResult = await db.collection(COLLECTION_NAME).findOneAndReplace({id}, itemFields, {returnOriginal: false});
        let item = updateResult.value || false;
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    },
    async delete(ctx) {
        const db = await getDb();

        let itemFields = ctx.request.body[ITEM_NAME];
        let id = itemFields.id;

        let updateResult = await db.collection(COLLECTION_NAME).findOneAndUpdate({id}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = updateResult.value || false;
        let response = {};
        response[ITEM_NAME] = item;

        ctx.body = response;
    },
    async resume(ctx) {
        let skills = ctx.request.body && ctx.request.body.skills
            ? ctx.request.body.skills || []
            : [];
        let uploadedFile = ctx.req.file;
        let name = uploadedFile.originalname;
        let buffer = uploadedFile.buffer;

        try {
            let {docText, candidate} = await parseFile({name, buffer}, skills, true);
            ctx.body = {candidate, docText};
        }
        catch (e) {
            ctx.body = {error: e};
        }
    }
}