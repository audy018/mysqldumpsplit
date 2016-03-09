# mysqldumpsplit

[![Travis](https://img.shields.io/travis/vekexasia/mysqldumpsplit.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/l/mysqldumpsplit.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/v/mysqldumpsplit.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/dt/mysqldumpsplit.svg?style=flat-square)]() [![Coveralls](https://img.shields.io/coveralls/vekexasia/mysqldumpsplit.svg?style=flat-square)]() [![node](https://img.shields.io/node/v/mysqldumpsplit.svg?style=flat-square)]()

**mysqldumpsplit**. is a sysadmin utility that splits a single .sql file into several .sql files (one per table)

The Module is written in ES6 transpiled using the wonderful Babel library. The 

You can leverage the cli command or import it in your node project. Please take a look at `./src/cli.js` on how to use it within your node project.

## Requirements

 - node.js - v0.12 or newer!   

## Installation

### On node project

    npm install mysqldumpsplit

### As cli command

    npm install mysqldumpsplit -g

## Performances

Since the library processes the .sql file using node streams it can handle large files without fully loading it in memory.

Using a pretty decent Laptop I was able to split a **180 tables, 16GB .sql** file in _under 2 minutes_ using _less than 50MB of RAM_.

## Cli usage

The cli command has only one required param: the `.sql` file path. It will split the file within the same folder.

If you wish to customize the location of the splitted files, provide the extra `-o` argument as described below:

```
  Usage: mysqldumpsplit [options] <dumpfile>

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -o, --output [folder]  The output folder, by default it will be the same folder of the dump

```
 
## How it works

Under the hood this node module uses my [streamsplit](https://github.com/vekexasia/streamsplit) node library to search for the string `Table structure for table` within the dump file. 
It then splits the original file using the locations of such token. Hence if you have a mysqldump that does not contain such string this won't work. If you're using a popular backup script please file a bug so that I can eventually add other popular tokens :)
