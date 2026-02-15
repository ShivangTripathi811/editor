const crypto = require('crypto');

const generateCodeforcesSig = (methodName, params, secret) => {
    const rand = Math.floor(Math.random() * 899999) + 100000;
    const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    const text = `${rand}/${methodName}?${sortedParams}#${secret}`;
    const hash = crypto.createHash('sha512').update(text).digest('hex');
    return `${rand}${hash}`;
};

// Test with dummy data
const methodName = 'user.status';
const params = {
    handle: 'tourist',
    from: '1',
    count: '20',
    apiKey: 'my_api_key',
    time: '1234567890'
};
const secret = 'my_secret';

const sig = generateCodeforcesSig(methodName, params, secret);
console.log('Method:', methodName);
console.log('Params:', params);
console.log('Secret:', secret);
console.log('Generated Signature:', sig);

if (sig.length === 128 + 6) {
    console.log('Signature length check PASSED (6 digits + 128 hex chars)');
} else {
    console.log('Signature length check FAILED', sig.length);
}
