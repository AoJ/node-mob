

//<quarantine>

var cb;
try
{
    cb = callback;
    callback = function () {};
    cb ( new Error ( "Under quarantine at @@." ) );
}
catch ( e ) {}

return;

//</quarantine>

