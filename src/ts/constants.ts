const testRuurdDev = false;

export const api = process.env.NODE_ENV === 'development' && !testRuurdDev
    ? 'http://localhost:3000'
    : 'https://api.ruurd.dev'
