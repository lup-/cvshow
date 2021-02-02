const moment = require('moment');
const he = require('he');
const dataConfig = require('./data/resume');
const FormData = require('form-data');
const axios = require('axios');

const CONVERTER_URL = process.env.CONVERTER_URL;

function unique(array) {
    return array.filter( (item, index) => array.indexOf(item) === index );
}
function matchAll(text, regexp) {
    let flagsNoGlobal = regexp.flags.replace('g', '');
    let globalRegexp = new RegExp(regexp.source, flagsNoGlobal+'g');
    let localRegexp = new RegExp(regexp.source, flagsNoGlobal);
    let matches = text.match(globalRegexp);
    if (matches === null) {
        return null;
    }

    if (matches && matches.length === 0) {
        return null;
    }

    let matchesWithGroups = [];
    for (const subtext of matches) {
        matchesWithGroups.push( subtext.match(localRegexp) );
    }

    return matchesWithGroups;
}

function clearWhitespacesAndSpacySymbols(text, skipDash) {
    return skipDash
        ? text.replace(/^[\s\.,_]+/, '').replace(/[\s\.,_]+$/, '').replace(/[\s\.,_]+/g, ' ')
        : text.replace(/^[\s\.,\-_]+/, '').replace(/[\s\.,\-_]+$/, '').replace(/[\s\.,\-_]+/g, ' ');
}
function clearStopwords(text, skipDash) {
    let stopWords = ['резюме', 'мужчина', 'женщина', 'resume', 'cv', 'male', 'female'].join('|');
    return clearWhitespacesAndSpacySymbols( text.replace(new RegExp(stopWords, 'gi'), ''), skipDash );
}
function cleanWrongLanguageLetters(text) {
    let wrongPairs = [
        {en: 'a', ru: 'а'},
        {en: 'e', ru: 'е'},
        {en: 'o', ru: 'о'},
        {en: 'c', ru: 'с'},
        {en: 'x', ru: 'х'},
    ]
    let countRuLetters = text.replace(/[^а-яё]/gi, '').length;
    let countEnLetters = text.replace(/[^a-z]/gi, '').length;
    let convertEnToRu = countRuLetters >= countEnLetters;
    let fromTo = wrongPairs.map( pair => {
        let from = pair[ convertEnToRu ? 'en' : 'ru' ];
        let to = pair[ convertEnToRu ? 'ru' : 'en' ];
        return {from, to}
    });

    for (const pair of fromTo) {
        text = text.replace( new RegExp(pair.from, 'g'), pair.to);
        text = text.replace( new RegExp(pair.from.toLocaleUpperCase(), 'g'), pair.to.toLocaleUpperCase());
    }

    return text;
}
function clearWhitespaces(text) {
    return text.replace(/\s+/g, '');
}
function normalizeLink(link, urlBase) {
    try {
        let parsedLink = new URL(link);
        return parsedLink.toString();
    }
    catch (e) {
        link = link.replace(/^.*\//, '');
        return urlBase ? normalizeLink(urlBase+link) : false;
    }
}
function crossFindIndex(tokens, test) {
    let fullMatchIndex = tokens.indexOf(test);
    if (fullMatchIndex !== -1) {
        return fullMatchIndex;
    }

    let testWords = test.split(' ');
    let hasAnyTestWordsIndex = tokens.findIndex( token => {
        let tokenWords = token.split(' ');
        let arrayIntersect = tokenWords.filter(word => testWords.includes(word));
        return arrayIntersect.length > 0;
    });

    if (hasAnyTestWordsIndex !== -1) {
        return hasAnyTestWordsIndex;
    }

    return false;
}
function findRawField(text, aliases) {
    let fieldRegex = new RegExp( '(?<=(' +aliases.join('|') + '):\\s+)(.*)', 'gi' );
    let altFieldRegex = new RegExp( '(?<=(' +aliases.join('|') + ')\\s+)(@.*)', 'gi' );
    let result = text.match(fieldRegex);

    if (!result) {
        result = text.match(altFieldRegex);
    }

    return result;
}
function findLinks(text, aliases, urlBase) {
    let rawLinks = findRawField(text, aliases);
    let links = rawLinks ? unique(rawLinks.map( rawLink => normalizeLink(rawLink, urlBase) )): false;

    if (!links && urlBase) {
        let parsedUrl = new URL(urlBase);
        let host = parsedUrl.hostname;

        let urlRegex = new RegExp('\\S+'+host+'^\\S+', 'gi');
        rawLinks = text.match(urlRegex);
        links = rawLinks ? unique(rawLinks.map( rawLink => normalizeLink(rawLink, urlBase) )): false;
    }

    return links ? links[0] : false;
}
function findContact(text, aliases) {
    let rawContacts = findRawField(text, aliases);
    let contacts = rawContacts ? unique(rawContacts.map( clearWhitespaces )): false;
    return contacts[0] || false;
}
function parseDate(text, formats) {
    for (const format of formats) {
        try {
            let date = moment.utc(text, format);
            if (date.isValid()) {
                return date;
            }
        }
        catch (e) {
        }
    }

    return false;
}
function checkPhone(date, phones) {
    let dateNumbers = date.replace(/\D+/g, '');
    return phones ? phones.reduce( (matchingPhoneFound, phone) => {
        let currentPhoneMatches = phone.indexOf(dateNumbers) !== -1;
        return matchingPhoneFound || currentPhoneMatches;
    }, false) : false;
}
function findDates(text) {
    let dateRegex = /(\d{2}\.\d{2}\.(\d{2}|\d{4})|(\d{2}|\d{4})-\d{2}-\d{2}|\d{1,2}\s[а-яa-z]+\s\d{4})/g;
    let rawDates = text.match(dateRegex);
    let dates = [];
    let phones = extractPhones(text);

    if (rawDates) {
        dates = rawDates
            .filter( (item, index) => rawDates.indexOf(item) === index )
            .filter( item => !checkPhone(item, phones) )
            .map((date) => parseDate(date, ['DD.MM.YYYY', 'DD.MM.YY', 'YYYY-MM-DD', 'YY-MM-DD', 'D MMMM YYYY']))
            .filter(item => item !== false)
            .filter(item => item.isValid());
    }

    return dates;
}
function normalizePhone(phone) {
    phone = phone.replace(/\D+/g, '').replace(/^\+8/, '+7');

    if (phone[0] === '8') {
        phone[0] = '7';
    }

    if (phone.length <= 10) {
        phone = '7'+phone;
    }

    return '+'+phone;
}
function filterNames(items) {
    return items.filter( item => {
        let itemParts = item.toLocaleLowerCase().split(/\s/);

        let hasName = false;
        let countFoundNames = 0;
        for (const part of itemParts) {
            //Иногда города называют по фамилиям людей. А иногда и фамилии по названиям городов. Москва, например. И город, и фамилия.
            let isNotCity = dataConfig.cities.indexOf(part) === -1;
            let isName = false;

            if (isNotCity) {
                isName = dataConfig.firstNames.indexOf(part) !== -1 || dataConfig.surNames.indexOf(part) !== -1 || dataConfig.familyNames.indexOf(part) !== -1;
                hasName = hasName || isName;
            }

            if (isName) {
                countFoundNames++;
            }
        }

        return hasName && (countFoundNames/itemParts.length > 0.5);
    });
}
function filterCities(items) {
    return items.filter( item => dataConfig.cities.indexOf(item.toLocale) !== -1 );
}
function splitFio(fio) {
    if (!fio) {
        return {f: false, i: false, o: false}
    }

    let lcParts = fio.toLocaleLowerCase().split(' ');
    let parts = fio.split(' ');

    if (parts.length === 3) {
        //есть фамилии которые как отчества. Викторович, например - и фамилия, и отчество.
        let isFamilyNameLast = dataConfig.familyNames.indexOf(lcParts[2]) !== -1 && dataConfig.surNames.indexOf(lcParts[2]) === -1;
        let isIOFpattern = isFamilyNameLast || dataConfig.firstNames.indexOf(lcParts[0]) !== -1;
        ;
        let [f, i, o] = parts;
        if (isIOFpattern) {
            [i, o, f] = parts;
        }

        return {f, i, o}
    }

    if (parts.length === 2) {
        let isIFpattern = dataConfig.familyNames.indexOf(lcParts[1]) !== -1 || dataConfig.firstNames.indexOf(lcParts[0]) !== -1;
        let [f, i] = parts;
        if (isIFpattern) {
            [i, f] = parts;
        }

        return {f, i, o: false}
    }

    if (parts.length === 1) {
        return {f: parts[0], i: false, o: false}
    }
}

function extractEmails(text) {
    let emailRegex = /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g;
    let rawEmails = text.match(emailRegex);
    let emails = false;

    if (rawEmails) {
        emails = unique( rawEmails );
    }

    return emails;
}
function extractPhones(text) {
    let phoneRegex = /(?<!\d)\+*\s*\d\s*\(*\d{3}\)*\s*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)/g;
    let rawPhones = text.match(phoneRegex);
    let phones = false;

    if (rawPhones) {
        phones = unique( rawPhones.map(normalizePhone) );
    }

    return phones;
}
function extractContacts(text) {
    return {
        email: extractEmails(text),
        phone: extractPhones(text),
        skype: findContact(text, ['Skype', 'Скайп']),
        telegram: findContact(text, ['Telegram', 'Telegramm', 'Телеграм', 'Телеграмм']),
        whatsapp: findContact(text, ['wh*atsapp*', 'WhatsApp', 'Вотсап', 'Вацап']),
    }
}
function extractName(text, fileName) {
    fileName = cleanWrongLanguageLetters(fileName);

    let nameRegex = /([А-ЯЁ][а-яё]+[\s\-_\.,]{1,2}){2,4}|([A-Z][a-z\-]+[\s\-_\.,]{1,2}){2}/gm;
    let names = text.match(nameRegex) ? text.match(nameRegex).map(name => clearStopwords(name, true)): [];
    let namesFromFilename = fileName.match(nameRegex) ? fileName.match(nameRegex).map(clearStopwords) : [];

    let nameIndex = false;
    if (namesFromFilename.length > 0) {
        nameIndex = crossFindIndex(names, namesFromFilename[0]);
        if (nameIndex !== false) {
            return names[nameIndex];
        }
    }

    let filteredNames = filterNames(names.concat(namesFromFilename));
    return filteredNames.length > 0 ? filteredNames[0] : false;
}
function extractCity(text) {
    let fieldCityRegex = /(?<=(Проживает|Город|Resid.*|City): )([A-ZА-ЯЁ][a-zа-яё]+[ \-]*){1,2}/g;
    let rawCities = text.match(fieldCityRegex);
    let cities = rawCities ? unique(rawCities.map(clearWhitespacesAndSpacySymbols)): false;

    if (cities.length > 1) {
        cities = filterCities(cities);
        return cities.length > 0 ? cities[0] : false;
    }

    return cities[0] || false;
}
function extractSocialNets(text) {
    let facebook = findLinks(text, ['Facebook', 'FB'], 'https://www.facebook.com/');
    let vk = findLinks(text, ['ВКонтакте', 'VKontakte', 'VK', 'ВК'], 'https://vk.com/');
    let linkedin = findLinks(text, ['LinkedIn'], 'https://www.linkedin.com/in/');
    let github = findLinks(text, ['GitHub'], 'https://www.github.com/');

    return {
        facebook,
        vk,
        linkedin,
        github
    }
}
function extractAgeAndBirthday(text) {
    let birthday = false;
    let age = false;

    let hhAgeBirthdayRegex = /(\d+)\s[a-zа-я]+,\s(born\son|родился|родилась)\s(\d+\s[a-zа-я]+\s\d{4})/i;
    let hhDates = text.match(hhAgeBirthdayRegex);

    if (hhDates) {
        let isRu = hhDates[0].indexOf('родил') !== -1;
        let [__, rawAge, _, rawBirthday] = hhDates;
        moment.locale(isRu ? 'ru' : 'en');
        let date = moment.utc(rawBirthday, 'D MMMM YYYY');
        age = parseInt(rawAge);
        birthday = date.toISOString();
    }

    if (!birthday) {
        let dates = findDates(text);
        if (dates.length > 0) {
            let minAge = 18;
            let maxAge = 120;

            let deltas = dates
                .map(date => moment.utc().diff(date, 'years'))
                .map(delta => delta < 0 ? delta + 100 : delta);

            let ages = deltas.filter(delta => delta >= minAge && delta <= maxAge );

            if (ages.length > 0) {
                age = ages[0];
                birthday = dates[deltas.indexOf(age)].toISOString();
            }
        }
    }

    return {
        age,
        birthday
    }
}
function extractPosition(text) {
    let positionRegex = /(?<=(Желаемая\s+)*должность(\s+и\s+зарплата)*\s).*$/gm;
    let position = text.match(positionRegex) ? text.match(positionRegex).map(clearWhitespacesAndSpacySymbols): [];

    return position && position.length > 1 ? position[position.length-1] : false;
}
function extractSalary(text) {
    let salaryRegex = /[\d\s]{4,}\s*(руб|USD|\$|EUR)/gmi;
    let salary = text.match(salaryRegex) ? text.match(salaryRegex).map(clearWhitespacesAndSpacySymbols): [];
    if (!salary || (salary && salary.length === 0)) {
        return false;
    }
    let salaryText = salary[0];
    let currency = salaryText.replace(/^[\d\s]+/g, '').toLocaleLowerCase() || false;

    return {
        value: parseInt(salaryText.replace(/\D+/, '')),
        currency
    };
}
function extractSkills(text, skills) {
    if (!skills) {
        return false;
    }

    let foundSkills = skills.filter( skill => {
        return text.toLocaleLowerCase().indexOf( skill.toLocaleLowerCase() ) !== -1;
    }, []);

    return foundSkills;
}

function extractHHSections(text) {
    const HH_SECTIONS = [
        {title: 'Желаемая должность и зарплата', regexp: /^Желаемая должность и зарплата$/ig },
        {title: 'Опыт работы', regexp: /^Опыт работы.*?(\d+ лет|\d+ год|\d+ месяц)/ig },
        {title: 'Образование', regexp: /^Образование$/ig },
        {title: 'Ключевые навыки', regexp: /^Ключевые навыки$/ig },
        {title: 'Знание языков', regexp: /^Знание языков$/ig },
        {title: 'Навыки', regexp: /^Навыки$/ig },
        {title: 'Дополнительная информация', regexp: /^Дополнительная информация$/ig },
        {title: 'Обо мне', regexp: /^Обо мне$/ig },
        {title: 'Резюме обновлено', regexp: /^Резюме обновлено$/ig },
        {title: 'Повышение квалификации, курсы', regexp: /^Повышение квалификации, курсы$/ig },
        {title: 'Комментарии к резюме', regexp: /^Комментарии к резюме$/ig },
        {title: 'История общения с кандидатом', regexp: /^История общения с кандидатом$/ig },
        {title: 'Опыт вождения', regexp: /^Опыт вождения$/ig },
    ];

    let textLines = text.split('\n');
    let extractedSections = [];
    let currentSectionLines = [];
    let currentSection = false;
    let rawSectionTitle = false;

    for (let line of textLines) {
        line = line.trim();

        let detectedSections = HH_SECTIONS.filter(section => section.regexp.test(removeParseMarks(line)));
        let isTitle = detectedSections.length > 0;

        if (isTitle) {
            extractedSections.push({
                title: currentSection ? currentSection.title : false,
                rawTitle: rawSectionTitle ? removeParseMarks(rawSectionTitle) : false,
                content: removeParseMarks(currentSectionLines.join('\n')),
                markedContent: currentSectionLines.join('\n'),
            });

            currentSection = detectedSections[0];
            rawSectionTitle = line;
            currentSectionLines = [];
        }
        else {
            currentSectionLines.push(line);
        }
    }

    extractedSections.push({
        title: currentSection ? currentSection.title : false,
        rawTitle: rawSectionTitle,
        content: removeParseMarks(currentSectionLines.join('\n')),
        markedContent: currentSectionLines.join('\n'),
    });

    return extractedSections;
}
function isHHResume(text) {
    let foundHHSections = extractHHSections(text).filter(section => section.title !== false);
    return foundHHSections && foundHHSections.length >= 2;
}
function parseCourseItem(lines) {
    let endYear = lines.shift();
    let title = removeParseMarks(lines.shift());
    let organisation = removeParseMarks(lines.shift());
    let description = removeParseMarks(lines.shift());
    let hasDate = /[0-9]{4}/.test(description);
    if (hasDate) {
        lines.unshift(description);
        description = false;
    }

    return {
        newLines: lines,
        item: {title, endYear, organisation, description, eduType: 'minor'},
    }
}
function parseEduHistoryItem(lines) {
    let type = lines.shift();
    let endYear = lines.shift();
    let organisation = removeParseMarks(lines.shift());
    let details = removeParseMarks(lines.shift());
    if ( checkMarks(details, ['org_title', 'org_descr']) ) {
        if (checkMarks(details, ['org_descr'])) {
            organisation += ' (' + details + ')';
        }
        else
        {
            organisation += ' ' + details;
        }
        organisation = removeParseMarks(organisation);
        details = lines.shift();
    }
    return {
        newLines: lines,
        item: {type, endYear, organisation, details, eduType: 'major'},
    }
}
function checkMarks(text, marks) {
    return marks.reduce((found, mark) => found || text.indexOf(`__${mark}__`) !== -1, false)
}
function parseWorkHistoryItem(lines) {
    let dates = lines.shift();
    let duration = lines.shift();
    if (/([А-Я][а-яё]+ \d{4}|настоящее)/ig.test(duration)) {
        dates += ' ' + duration;
        duration = lines.shift();
    }

    let start;
    let end;

    try {
        [start, end] = dates.split(/ *[-—] */i);
    }
    catch (e) {
        start = dates;
        end = false;
    }
    let organisation = removeParseMarks( lines.shift() );

    let position = lines.shift();
    if (checkMarks(position, ['org_title', 'org_descr'])) {
        if (checkMarks(position, ['org_descr'])) {
            organisation += ' (' + position + ')';
        }
        else
        {
            organisation += ' ' + position;
        }
        organisation = removeParseMarks(organisation);
        position = lines.shift();
    }

    let description = [];
    let hasDate;

    do {
        let line = lines.shift();
        if (line) {
            hasDate = /[А-Я][а-яё]+ \d{4}/.test(line);
            if (hasDate) {
                lines.unshift(line);
            }
            else {
                description.push(line);
            }
        }
    } while (!hasDate && lines.length > 0);

    return {
        newLines: lines,
        item: {start, end, duration, organisation, position, description: description.join('\n')},
    }
}
function parseSection(section, parseItemFn) {
    let lines = section.markedContent.split('\n');

    let items = [];
    while (lines && lines.length > 0) {
        let {newLines, item} = parseItemFn(lines);
        lines = newLines;
        items.push(item);
    }

    return items;
}
function extractHHSkills(skillsSection) {
    return skillsSection.content
        .replace(/ /g, ' ')
        .replace(/\n/g, '   ')
        .replace(/ /g, '   ')
        .replace(/[,;]/g, '   ')
        .split(/ {2,}/).map(line => line.trim());
}
function extractAbout(aboutSection) {
    let lines = aboutSection.content.split('\n');
    let isLastLineFooter = /[0-9]{4}/.test(lines[lines.length-1]);
    if (isLastLineFooter) {
        lines.pop();
    }

    return lines.join('\n');
}
function extractAdditionalDataIfHH(text) {
    if (!isHHResume(text)) {
        return false;
    }

    let sections;
    try {
        sections = extractHHSections(text);
    }
    catch (e) {
        return false;
    }

    let whSection = sections.find(section => section.title === 'Опыт работы');
    let work;
    try {
        work = whSection ? parseSection(whSection, parseWorkHistoryItem) : false;
    }
    catch (e) {
        work = false;
    }

    let eduSection = sections.find(section => section.title === 'Образование');
    let education;
    try {
        education = eduSection ? parseSection(eduSection, parseEduHistoryItem) : [];
    }
    catch (e) {
        education = [];
    }

    let minEduSection = sections.find(section => section.title === 'Повышение квалификации, курсы');
    let minEducation;
    try {
        minEducation = minEduSection ? parseSection(minEduSection, parseCourseItem) : [];
    }
    catch (e) {
        minEducation = [];
    }

    education = education.concat(minEducation);
    if (education.length === 0) {
        education = false;
    }

    let skillsSection = sections.find(section => section.title === 'Навыки');
    let skills = skillsSection ? extractHHSkills(skillsSection) : false;

    let aboutSection = sections.find(section => section.title === 'Обо мне');
    let about = aboutSection ? extractAbout(aboutSection) : false;

    return {work, education, skills, about};
}

function extractDataFromText(markedDocText, fileName, allSkills = false) {
    let docText = removeParseMarks(markedDocText);
    let {age, birthday} = extractAgeAndBirthday(docText);
    let name = extractName(docText, fileName);
    let hh = extractAdditionalDataIfHH(markedDocText);
    let skills = allSkills ? extractSkills(docText, allSkills) : [];
    if (hh.skills && hh.skills.length > 0) {
        skills = skills.concat(hh.skills);
    }

    let extractedData = {
        name,
        nameParts: splitFio(name),
        position: extractPosition(docText),
        salary: extractSalary(docText),
        city: extractCity(docText),
        age,
        birthday,
        contacts: extractContacts(docText),
        social: extractSocialNets(docText),
        skills,
        hh,
    }

    return extractedData;
}
async function extractImagesFromFile(filePath, onError) {
    let fileName = filePath.replace(/^.*\//, '');
    let dockerFileName = '/data/files/'+fileName;

    try {
        let docHTML = await getHTMLFromAny(dockerFileName);
        let images = matchAll(docHTML, /src=["']*data:(.*?);base64,([^"' ]+).*?width=["']*(\d+).*?height=["']*(\d+)/g);
        if (!images) {
            return false;
        }

        let parsedImages = [];
        for (const image of images) {
            let [, mimeType, base64, width, height] = image;
            width = parseInt(width);
            height = parseInt(height);

            parsedImages.push( {base64, mimeType, width, height} );
        }

        return parsedImages;
    }
    catch (e) {
        if (typeof (onError) === 'function') {
            onError(e);
        }
        return false;
    }
}

async function getTextFromAny({name, buffer}, format = 'txt') {
    let requestData = new FormData();
    requestData.append('file', buffer, {filename: name});

    let {data} = await axios.post(CONVERTER_URL + '/convert/' + format, requestData,
        { headers: {'Content-Type': `multipart/form-data; boundary=${requestData._boundary}` }});

    return data;
}

function getHTMLFromAny(file) {
    return getTextFromAny(file, 'html');
}
function normalizeLineBreaks(html) {
    let paragraphs = html.match(/<p.*?<\/p>/igs);
    for (let paragraph of paragraphs) {
        let newParagraph = paragraph
            .replace(/\n\t*/g, ' ')
            .replace(/      /g, ' ')
            .replace(/ +/g, ' ')
            .replace(/<br\/*>/ig, '\n');
        html = html.replace(paragraph, newParagraph);
    }

    return html;
}
function addParseMarks(html) {
    const MARKS = [
        {regexp: /12pt.*?><b>/ig, text: '__org_title__'},
        {regexp: /font.*?aeaeae.*?>/ig, text: '__org_descr__'},
        {regexp: /<p><b>/ig, text: '__org_title__'},
    ];

    for (const mark of MARKS) {
        let matches = html.match(mark.regexp);
        if (matches) {
            let uniqueMatches = matches.filter((item, index, all) => all.indexOf(item) === index);
            for (const match of uniqueMatches) {
                html = html.replace(new RegExp(match, 'g'), match + mark.text)
            }
        }
    }

    return html;
    /*<font size="3" style="font-size: 12pt"><b>МосДемонтажИнжиниринг</b></font></p>
<p style="margin-bottom: 0cm"><font color="#aeaeae"><font size="2" style="font-size: 9pt">Москва,
crushmash.com</font></font></p>*/
    /*<p style="margin-bottom: 0cm"><font color="#aeaeae"><font size="2" style="font-size: 9pt">Москва</font></font></p>*/

}
function removeParseMarks(text) {
    return text.replace(/__.*?_.*?__/g, '');
}
function filterFooter(text) {
    return text.split('\n').filter(line => !(/\d{2}.*?\d{4}.*?\d{2}:\d{2}/.test(line))).join('\n');
}
function trimHTML(html) {
    return he.decode(html)
        .replace(/<style.*?\/style>/sig, '')
        .replace(/<!\-\-.*?\-\->/sig, '')
        .replace(/<\?[a-z]+.*?>/ig, '')
        .replace(/<![a-z]+.*?>/sig, '')
        .replace(/<\/*[a-z]+.*?>/ig, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/(\n *)+/g, '\n')
        .replace(/ +/, ' ')
        .trim();
}

async function parseFile(file, skills = [], throwError = false) {
    try {
        let htmlText = await getTextFromAny(file, 'html');
        let processedHtml = normalizeLineBreaks(htmlText);
        processedHtml = addParseMarks(processedHtml);
        let markedDocText = trimHTML(processedHtml);
        markedDocText = filterFooter(markedDocText);
        let docText = removeParseMarks(markedDocText);
        let candidate = extractDataFromText(markedDocText, file.name, skills);

        return {docText, candidate};
    }
    catch (e) {
        if (throwError) {
            throw e;
        }
        else {
            return false;
        }
    }
}

module.exports = {parseFile}