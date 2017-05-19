import proxyquire from 'proxyquire';
import { expect } from 'chai';
import sinon from 'sinon';
import streamBuffers from 'stream-buffers';
import { Observable } from 'rxjs';

/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions, no-new, max-len */


const splitToken       = '\n--\n-- Table structure for table';
const splitTokenLength = splitToken.length;

const streamsplitStub = {};
const fileUtilsStub   = {};
const fsStub          = {
  createReadStream: () => new streamBuffers.ReadableStreamBuffer(
    {
      frequency: 10,   // in milliseconds.
      chunkSize: 5  // in bytes.
    })
};
const split           = proxyquire('../src/mysql.js', {
  streamsplit           : streamsplitStub,
  './FileUtils.class.js': fileUtilsStub,
  fs                    : fsStub
});

// nooop
function noOp() {
}

describe('mysql.splitter', () => {
  beforeEach(() => {
    fileUtilsStub.copyChunkOfFileToAnother = sinon.spy((a, b, c, d) => new Promise(resolve => resolve(d)));
    fileUtilsStub.readChunkOfFileToBuff    = sinon.spy((file, start, end) => new Promise(resolve => resolve(new Buffer(end - start))));
    streamsplitStub.split                  = sinon.spy(() => Observable.of({ start: 1, end: 10 }));
  });
  afterEach(() => {
    delete fileUtilsStub.copyChunkOfFileToAnother;
    delete fileUtilsStub.readChunkOfFileToBuff;
    delete streamsplitStub.split;
  });

  it('should call streamsplit.split with noEmptyMatches and correct splitToken', done => {
    split()
      .subscribe(
        noOp,
        done,
        () => {
          expect(streamsplitStub.split.calledOnce).is.true;
          expect(streamsplitStub.split.firstCall.args[0].token).to.contain('Table structure for table');
          expect(streamsplitStub.split.firstCall.args[0].noEmptyMatches).is.true;
          done();
        }
      );
  });

  // TODO: One day it might be btter to refactor this test to a subset of smaller ones.
  it('should call 2 Times read and copy from file utils with correct arguments', done => {
    streamsplitStub.split = sinon.spy(() => Observable.from([{ start: 0, end: 2 }, { start: 3, end: 40 }]));
    split('/tmp/lol.sql')
      .subscribe(
        noOp,
        done,
        () => {
          expect(fileUtilsStub.readChunkOfFileToBuff.callCount).to.be.equal(2);
          expect(fileUtilsStub.readChunkOfFileToBuff.firstCall.args[1]).to.be.equal(0 - splitTokenLength);
          expect(fileUtilsStub.readChunkOfFileToBuff.firstCall.args[2]).to.be.greaterThan(0 - splitTokenLength);
          expect(fileUtilsStub.readChunkOfFileToBuff.getCall(1).args[1]).to.be.equal(3 - splitTokenLength);
          expect(fileUtilsStub.readChunkOfFileToBuff.getCall(1).args[2]).to.be.greaterThan(3 - splitTokenLength);

          expect(fileUtilsStub.copyChunkOfFileToAnother.callCount).to.be.equal(2);
          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(0).args[0]).to.be.equal(0); // compensation
          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(1).args[0]).to.be.equal(3 - splitTokenLength);

          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(0).args[1]).to.be.equal(2);
          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(1).args[1]).to.be.equal(40);

          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(0).args[2]).to.be.equal('/tmp/lol.sql');
          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(1).args[2]).to.be.equal('/tmp/lol.sql');

          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(0).args[3]).to.be.equal('/tmp/lol-_unknown_0.sql');
          expect(fileUtilsStub.copyChunkOfFileToAnother.getCall(1).args[3]).to.be.equal('/tmp/lol-_unknown_1.sql');
          done();
        }
      );
  });

  it('should emit the files named as the tables in sql', done => {
    const tableName = 'myTableName';
    fileUtilsStub.readChunkOfFileToBuff = () => new Promise(resolve => resolve(new Buffer(`${splitToken} \`${tableName}\``)));
    let called = false;
    split('/tmp/lol.sql')
      .subscribe(
        n => {
          called = true;
          expect(n).to.contain(tableName);
          expect(n).to.contain('/tmp/lol');
        },
        done,
        () => {
          expect(called).is.true;
          done();
        }
      );
  });

  it('should use a different path for output tables if given', done => {
    const tableName = 'myTableName';
    fileUtilsStub.readChunkOfFileToBuff = () => new Promise(resolve => resolve(new Buffer(`${splitToken} \`${tableName}\``)));
    let called = false;
    split('/tmp/lol.sql', '/out')
      .subscribe(
        n => {
          called = true;
          expect(n).to.be.equal(`/out/lol-${tableName}.sql`);
        },
        done,
        () => {
          expect(called).is.true;
          done();
        }
      );
  });
});
