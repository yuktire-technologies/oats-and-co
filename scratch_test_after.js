const { after, unstable_after } = require('next/server');
console.log("after:", typeof after);
console.log("unstable_after:", typeof unstable_after);
