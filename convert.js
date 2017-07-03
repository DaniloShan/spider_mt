const fs = require('fs');
const allCity = require('./allcity').data;

const source = './source';
const result = './result';

// allCity.forEach((item) => {
//     const acronym = item.acronym;
//     const name = item.name;
//     if (fs.existsSync(`${source}/${acronym}.csv`)) {
//         fs.renameSync(`${source}/${acronym}.csv`, `${result}/${name}.csv`);
//     }
// });

let i;
let index = 0;
let count = 0;

const convert = (item) => {
    const acronym = item.acronym;
    const name = item.name;
    if (fs.existsSync(`${source}/${acronym}.csv`)) {
        fs.renameSync(`${source}/${acronym}.csv`, `${result}/${name}.csv`);
    }
};

const calcLine = () => {
    if (fs.existsSync(`./source/${allCity[index].acronym}.csv`)) {
        fs.createReadStream(`./source/${allCity[index].acronym}.csv`)
            .on('data', (chunk) => {
                for (i = 0; i < chunk.length; i++)
                    if (chunk[i] === 10) count++;
            })
            .on('end', () => {
                console.log(index);
                if (count <= 1) {
                    fs.appendFileSync('./need_fetch.js', `${allCity[index].acronym},`);
                }
                index++;
                count = 0;
                calcLine();
            });
    }
};

calcLine();
