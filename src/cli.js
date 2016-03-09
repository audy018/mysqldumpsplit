#!/usr/bin/env node
/* eslint-disable no-console */

import program from 'commander';
import mysqlSplit from './mysql';

program
  .version('1.0.0')
  .usage('[options] <dumpfile>')
  .option('-o, --output [folder]',
    'The output folder, by default it will be the same folder of the dump')
  .parse(process.argv);

if (program.args.length !== 1) {
  program.outputHelp();
} else {
  console.log('Starting :)');
  mysqlSplit(program.args[0], program.output)
    .subscribe(
      console.log,
      console.log,
      () => console.log('completed')
    );
}
