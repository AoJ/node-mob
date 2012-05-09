

    ////

var EventEmitter = require ( 'events' ).EventEmitter,
    cluster = require ( 'cluster' );

if ( cluster.isMaster || !cluster.isWorker )
    throw new Error ( "Not worker." );


    ////

function Mobster ()
{
    var self = this,
        base,
        roles = {},
        role,
        exports = {}, proxies = {},
        callbacks = new Callbacks ( this );


        ////    Export and require.

    function publishExports ( object )
    {
        var key,
            methods = [];

        if ( !object )
            throw new Error ( "Falsy export." );

        if ( typeof object === 'function' )
            methods.push ( '.' );

        for ( key in object )
            if ( typeof object [ key ] === 'function' )
                methods.push ( key );

        process.send ({ MOB : 'EXPORT', methods : methods });
        callbacks.forward ( object );
    }

    self.require = function ( name )
    {
        if ( !exports [ name ] )
            throw new Error ( "Not aware of `" + name + "`'s exports, perhaps change `.role()` order." );
        if ( !proxies [ name ] )
            proxies [ name ] = callbacks.makeProxy ( name, exports [ name ] );

        return proxies [ name ];
    };


        ////    Assign role.

    self.base = function ( module )
    {
        base = module;
        return self;
    };

    self.start = function ()
    {
        delete self.start;
        process.on ( 'message', function ( msg, handle )
        {
            if ( !msg )
                return;

            if ( msg.MOB === 'ROLE' )
            {
                if ( role )         throw new Error ( "MOB/ROLE: Already assigned role." );
                if ( !msg.role )    throw new Error ( "MOB/ROLE: No role." );
                if ( !msg.name )    throw new Error ( "MOB/ROLE: No name." );

                role = roles [ msg.role ];
                if ( !role )        throw new Error ( "MOB/ROLE: No such role : " + msg.role );

                process.title = msg.name + ' - ' + role + ' (mobster)';
                exports = msg.exports;
                publishExports
                (
                    ( base || module ).require ( role )
                );

                process.send ({ MOB : 'ROLE', path : role });
            }

            else
                self.emit ( 'message', msg, handle );
        });

        process.nextTick
        (
            process.send.bind ( process, { MOB : 'JOIN' } )
        );

        return self;
    };

    self.role = function ( name, path, options )
    {
        if ( roles [ name ] )
            throw new Error ( "'" + name + "' exists already." );

        roles [ name ] = path;
        return self;
    };


        ////    Scaling.

    self.scale = function ( incr )
    {
        if ( incr < 0 )
            process.send ({ MOB : 'SCALE', incr : incr });
    };
    


        ////    Messaging.

    function send ( obj, handle, filter, count )
    {
        if ( !obj )     throw new Error ( "Falsy message." );
        if ( !count )   throw new Error ( "Falsy count." );

        process.send
        (
            { MOB : 'MESSAGE', msg : obj, filter : filter, count : count },
            handle
        );
    }

    self.send = function ( obj, handle )
    {
        send ( obj, handle, null, 0xffffff );
        return self;
    };

    self.any = function ( filter )
    {
        return { send : function ( obj, handle )
        {
            send ( obj, handle, filter, 1 );
            return this;
        }};
    };

    self.pid =
    self.all = function ( filter )
    {
        return { send : function ( obj, handle )
        {
            send ( obj, handle, filter, 0xffffff );
            return this;
        }};
    };


        ////    Events.

    EventEmitter.call ( this );
}

Mobster.prototype = EventEmitter.prototype;


    ////

function Callbacks ( mob )
{
    var self = this,
        callbacks = {},
        counter = 0,
        exported;

        ////

    function store ( func )
    {
        if ( !func ) throw new Error ( "No func!" );
        callbacks [ ++ counter ] = func;
        return [ process.pid, counter, Date.now () ];
    }

    function fetch ( tuple )
    {
        var func = callbacks [ tuple [ 1 ] ];
        delete callbacks [ tuple [ 1 ] ];
        return func;
    }

        ////

    function wrap ( realargs )
    {
        var args = [], i, n = realargs.length, realarg, type;

        for ( i = 0; i < n; i ++ )
        {
            realarg = realargs [ i ];
            if ( ( type = typeof realarg ) === 'function' )
                args.push ({ type : 'function', tuple : store ( realarg ) });
            else
                args.push ({ type : type, data : realarg });
        }

        return args;
    }

    function linkCallback ( tuple )
    {
        if ( tuple [ 0 ] === process.pid )
            throw Error ( "This is a local callback ID." );

        return function ()
        {
            mob.pid ( tuple [ 0 ] )
               .send ({ MOB : 'CALLBACK', tuple : tuple, args : wrap ( arguments ) });
        };
    }

    function linkCall ( name, method )
    {
        return function ()
        {
            mob.any ( name )
               .send ({ MOB : 'CALL', method : method, args : wrap ( arguments ) });
        };
    }

    function unwrap ( args )
    {
        var realargs = [], i, n = args.length, arg;

        for ( i = 0; i < n; i ++ )
        {
            arg = args [ i ];
            if ( arg.type === 'function' )
                realargs.push ( linkCallback ( arg.tuple ) );
            else
                realargs.push ( arg.data );
        }

        return realargs;
    }

        ////

    self.forward = function ( exports )
    {
        exported = exports;
    };

    self.makeProxy = function ( name, methods )
    {
        var obj, i, n = methods.length, method;

        if ( n && methods [ 0 ] === '.' )
        {
            obj = linkCall ( name, methods.shift () );
            n --;
        }
        else
            obj = {};

        for ( i = 0; i < n; i ++ )
        {
            method = methods [ i ];
            obj [ method ] = linkCall ( name, method );
        }

        return obj;
    };

        ////

    mob.on ( 'message', function ( msg )
    {
        var func;

        if ( msg.MOB === 'CALLBACK' )
        {
            if ( !msg.tuple )
                throw new Error ( "No tuple." );
            if (( func = fetch ( msg.tuple ) ))
                func.apply ( null, unwrap ( msg.args ) );
        }

        else if ( msg.MOB === 'CALL' )
        {
            if ( !exported )
                throw new Error ( "Nothing exported." );
            if ( !( msg.method === '.' && typeof ( func = exported ) === 'function' ) && !( func = exported [ msg.method ] ) )
                throw new Error ( "Not an exported method: " + msg.method );

            func.apply ( exported, unwrap ( msg.args ) );
        }
    });
}


    ////

module.exports = new Mobster;
