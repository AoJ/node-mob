

/**

    DONT USE THIS.
    It's totally unsafe right now, based on some really silly heuristics.

 **/
 

    ////    This is the quarantine block.
    ////    @@ will get replaced by the file:line:char of the original error.

var QUARANTINE = '\n\n//<quarantine>\n;try{callback(new Error("Under quarantine at @@."))}catch(e){}return;\n//</quarantine>\n\n',
    SEARCH = QUARANTINE.substr ( 0, 10 ),
    fs = require ( 'fs' );


    ////    Apply the quarantine to this stack trace.

module.exports = function ( stack )
{

    ////    Rewrite sources only if explicitly allowed by the environment.

    if ( !process.env.ALLOW_QUARANTINE )
    {
        process.stderr.write ( '\033[1;31mQUARANTINE NOT ALLOWED BY THE ENVIRONMENT.\033[0m\n' );
        return false;
    }

    else
        process.stderr.write ( '\033[1;33mATTEMPTING QUARANTINE ...\033[0m\n' );


    ////    Attempt to apply a quarantine to the affected file
    ////        somewhere around the point of death,
    ////            and only so long as it is part of the app and not its dependencies.

    var pattern = /([\\\/a-zA-Z0-9._-]+):([0-9]+):([0-9]+)/g,
        matches, source, head, len, x, y;

    while (( matches = pattern.exec ( stack ) ))
    {
        process.stderr.write ( '\033[1;33m' + matches [ 1 ] + ' ...\033[0m\n' );

        if ( matches [ 1 ].indexOf ( 'node_modules' ) >= 0 )
        {
            process.stderr.write ( '\033[1;31mQUARANTINE FAILS (TYPE A1).\033[0m\n' );
            return false;
        }
        else
            try
            {
                source = fs.readFileSync ( matches [ 1 ], 'utf8' );
                head = trimLast ( source.split ( '\n' ).slice ( 0, Number ( matches [ 2 ] ) ), Number ( matches [ 3 ] ) ).join ( '\n' );
                len = head.length;

                    ////    Really crude, at least some minimal syntactic analysis should be applied to

                if ( len > 0 && ( x = head.lastIndexOf ( 'function' ) ) >= 0 && ( x = head.indexOf ( '{', x ) ) > 0 )
                {
                    x ++;

                        ////    Another process might have already applied a quarantine here.

                    if ( ( y = source.indexOf ( SEARCH, x ) ) >= 0 && y <= len )
                    {
                        process.stderr.write ( '\033[1;32mQUARANTINE ALREADY IN PLACE.\033[0m\n' );
                        return true;
                    }
                        

                        ////    Rewrite the file.

                    fs.writeFileSync
                    (
                        matches [ 1 ],
                        head.substr ( 0, x ) + QUARANTINE.replace ( '@@', matches [ 0 ] ) + head.substr ( x ) + source.substr ( len ),
                        'utf8'
                    );

                        ////    Only need to do this once.

                    process.stderr.write ( '\033[1;32mQUARANTINE SUCCESSFUL.\033[0m\n' );
                    return true;
                }
            }
            catch ( e )
            {
                process.stderr.write ( e.stack + '\n' );
            }
    }


        ////    Fail.

    process.stderr.write ( '\033[1;31mQUARANTINE FAILS (TYPE A2).\033[0m\n' );
    return false;
};


function trimLast ( lines, chr )
{
    lines [ lines.length - 1 ] = lines [ lines.length - 1 ].substr ( 0, chr );
    return lines;
}

