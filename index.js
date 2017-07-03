const cheerio = require('cheerio');
const request = require('superagent');
const fs = require('fs');
const heapdump = require('heapdump');
const cityList = require('./citylist');

// heapdump.writeSnapshot('/Users/zhuoqunshan/www/personal/spider_mt/mem/initial.heapsnapshot');

let uaCount = 100;
let isDone = false;

const getPageUrl = (cityId, pageNum) => `http://hotel.meituan.com/${cityId}/page${pageNum}`;
const getUa = () => {
    const uaPrefix = +(Date.now().toString().slice(-6));
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/${uaPrefix * Math.random()}.${uaCount * Math.random()}`;
};

const getHotelData = async (url) => {
    uaCount += 1;
    // const { err, res } = await request.get(url).set({ 'Referer': url, 'User-Agent': getUa() });
    return new Promise((resolve, reject) => {
        request.get(url).set({
            'Referer': url,
            'suid': Math.floor(10000000000 * Math.random()),
            'uuid': Math.floor(10000000000 * Math.random()),
            'User-Agent': getUa()
        })
            .end(async (err, res) => {
                let $ = null;
                let title = null;
                let phone = null;
                try {
                    if (!err) {
                        $ = cheerio.load(res.text);
                        title = $('h5.uix-tooltip').text();
                        phone = $($('.poi-hotelinfo__content .col-last')[0]).text().trim();
                        if (phone && phone.length && /^[0-9-\/]*$/g.test(phone)) {
                            const result = { title: title.trim() };
                            let phoneCount = 0;
                            phone.split('/').forEach((num, i) => {
                                if (num && phoneCount < 2) {
                                    num = num.trim();
                                    result[`phone${i + 1}`] = num.replace('-', '');
                                    phoneCount += 1;
                                }
                            });
                            if (phoneCount) {
                                $ = null;
                                title = null;
                                phone = null;
                                return resolve(result);
                            } else {
                                console.warn('no phone: ', phone, phoneCount);
                                $ = null;
                                title = null;
                                phone = null;
                                return reject({
                                    error: true
                                });
                            }
                        } else {
                            console.warn('no phone: ', phone);
                            $ = null;
                            title = null;
                            phone = null;
                            return reject({
                                error: true
                            });
                        }
                    } else {
                        $ = null;
                        title = null;
                        phone = null;
                        console.error('get hotel data err: ', err);
                        return reject({
                            error: true
                        });
                    }
                } catch (e) {
                    console.error('hotel fn error: ', e);
                }
            })
    });
};

const getHotelList = async (url) => {
    //const { err, res } = await request.get(url).set({ 'Referer': url, 'User-Agent': getUa() });
    return new Promise(async (resolve, reject) => {
        request.get(url).set({ 'Referer': url, 'User-Agent': getUa() })
            .end(async (err, res) => {
                let hotelList = null;
                let hotelDataList = null;
                let $ = null;
                if (!err) {
                    if (!res.text) {
                        return reject();
                    }
                    $ = cheerio.load(res.text);
                    hotelList = $('.hotel-list .hotel .hotel--detail .title');
                    if (!hotelList || !hotelList.length) {
                        isDone = true;
                        hotelList = null;
                        $ = null;
                        return resolve([]);
                    }
                    hotelDataList = [];
                    for (let i = 0, il = hotelList.length; i < il; i++) {
                        const item = hotelList[i];
                        const url = $(item).attr('href');
                        if (url) {
                            try {
                                console.log('hotel data ', i);
                                const result = await getHotelData(url);
                                if (!result.error) {
                                    hotelDataList.push(result);
                                }
                            } catch (_e) {
                                console.error(url, ' ', _e);
                            }
                        }
                    }
                    hotelList = null;
                    $ = null;
                    return resolve(hotelDataList);
                } else {
                    hotelList = null;
                    hotelDataList = null;
                    return reject(err);
                }
            })
    })
};

const pageWalker = async (cityId, pageNum) => {
    const url = getPageUrl(cityId, pageNum);
    let hotelDataList = null;
    try {
        hotelDataList = await getHotelList(url);
        if (!hotelDataList || !hotelDataList.length) {
            isDone = true;
            return;
        }
        let line = '';
        hotelDataList.forEach((item) => {
            line += `${item.title},,${item.phone1 || ''},${item.phone2 || ''}\n`;
        });
        fs.appendFileSync(`./data/${cityId}.csv`, line);
        hotelDataList = null;
        console.log('done ', pageNum);
    } catch (e) {
        hotelDataList = null;
        if (e && +e.status === 404) {
            isDone = true;
        } else {
            console.error(e);
        }
    }
};

const startCityWalker = async (cityId, page) => {
    return new Promise(async (resolve, reject) => {
        let p = page;
        try {
            while (!isDone) {
                await pageWalker(cityId, p);
                p += 1;
            }
            p = null;
            return resolve(`${cityId} done.`);
        } catch (e) {
            p = null;
            return reject(e);
        }
    });
};

const start = async (listIndex, tmpPageNum) => {
    const cityId = cityList[listIndex];
    let res = null;
    if (!cityId) {
        console.log('========================');
        console.log('all done');
        console.log('========================');
        return new Promise(resolve => resolve());
    }
    cityObj.lastCity = cityId;
    console.log('========================');
    console.log('start ', cityId, isDone);
    console.log('========================');
    if (!fs.existsSync(`./data/${cityId}.csv`)) {
        fs.appendFileSync(`./data/${cityId}.csv`, '姓,名,家庭手机,工作手机\n')
    }
    try {
        res = await startCityWalker(cityId, tmpPageNum || 1);
        console.log('========================');
        console.log(res);
        console.log('========================');
        isDone = false;
        res = null;
        // return start(listIndex + 1);
        // heapdump.writeSnapshot('/Users/zhuoqunshan/www/personal/spider_mt/mem/' + cityId + '.heapsnapshot');
        cityObj.tmpPageNum = listIndex + 1;
        setTimeout(() => {
            start(cityObj.tmpPageNum);
        }, 1000 * 3);
    } catch (e) {
        res = null;
        console.error(e);
    }
};

process.on('uncaughtException', (err) => {
    console.log(`Caught exception: ${err}\n`);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

const cityObj = {
    lastCity: 'sanx',
    tmpPageNum: 1
};

try {
    const index = cityList.indexOf(cityObj.lastCity) === -1 ? 0 : cityList.indexOf(cityObj.lastCity);
    start(index, cityObj.tmpPageNum);
} catch (e) {
    console.error('process error: ', e);
}
