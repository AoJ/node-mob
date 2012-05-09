

require('mob')
  .start('myapp') //  starts the app and sets the process.title prefix for all processes.
  .base(module)   //  optional, all roles will have their paths resolved relatively to this module.

  //  .role() accepts three parameters:
  //  - the name of the role to be used with `mob.require()`;
  //  - the module to require in child processes assigned with this role;
  //  - any options, currently only the number of worker processes to spin up and keep alive.

    .role('back',  "./background-jobs.js", {workers: 4})
    .role('front', "./http-server.js", {workers: 2});

