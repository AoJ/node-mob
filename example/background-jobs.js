

console.log('Background worker ' + process.pid + ' running.' );

exports.foo = function () {
  console.log('Bar! My pid is ' + process.pid);
};

