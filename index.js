
if ( require ( 'cluster' ).isMaster )
    module.exports = require ( './lib/kingpin' );

else
    module.exports = require ( './lib/mobster' );
