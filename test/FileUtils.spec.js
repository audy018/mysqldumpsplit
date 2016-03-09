import proxyquire from 'proxyquire';
import { expect } from 'chai';
import sinon from 'sinon';
import streamBuffers from 'stream-buffers';

/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions, no-new, max-len */
const fsStub    = {};
const FileUtils = proxyquire('../src/FileUtils.class.js', { fs: fsStub });

describe('FileUtils', () => {
  describe('copyChunkOfFileToAnother', () => {
    let readableStream;
    let writeableStream;
    beforeEach(() => {
      readableStream  = new streamBuffers.ReadableStreamBuffer(
        {
          frequency: 10,   // in milliseconds.
          chunkSize: 5  // in bytes.
        });
      writeableStream = new streamBuffers.WritableStreamBuffer(
        {
          initialSize    : (100 * 1024),   // start at 100 kilobytes.
          incrementAmount: (10 * 1024) // grow by 10 kilobytes each time buffer overflows.
        });

      fsStub.createReadStream  = sinon.spy(() => readableStream);
      fsStub.createWriteStream = sinon.spy(() => writeableStream);
    });

    afterEach(() => {
      delete fsStub.createReadStream;
      delete fsStub.createWriteStream;
    });

    it('should call createReadStream with sourceFile', () => {
      FileUtils.copyChunkOfFileToAnother(0, 0, 'sourceFile', 'endFile');
      expect(fsStub.createReadStream.firstCall.args[0]).is.equal('sourceFile');
    });
    it('should call createReadStream with start=10', () => {
      FileUtils.copyChunkOfFileToAnother(10, 0, 'sourceFile', 'endFile');
      expect(fsStub.createReadStream.firstCall.args[1].start).is.equal(10);
    });
    it('should call createReadStream with end=20-1', () => {
      FileUtils.copyChunkOfFileToAnother(10, 20, 'sourceFile', 'endFile');
      expect(fsStub.createReadStream.firstCall.args[1].end).is.equal(19);
    });

    describe('copy test', () => {
      it('should copy content and resolve with endFile', done => {
        readableStream.put('0123456789', 'utf8');
        readableStream.stop();
        FileUtils.copyChunkOfFileToAnother(10, 20, 'sourceFile', 'endFile')
          .then(fname => {
            expect(fname).to.be.equal('endFile');
            expect(writeableStream.getContents(10).toString('utf8')).to.be.equal('0123456789');
            done();
          });
      });
      it('should emit error if readablestream provides it', done => {
        process.nextTick(() => {
          readableStream.emit('error', new Error('ahaha'));
        });
        FileUtils.copyChunkOfFileToAnother(1, 2, 's', 's')
          .catch(a => {
            expect(a).to.be.not.null;
            done();
          });
      });
    });
  });

  describe('readChunkOfFileToBuff', () => {
    beforeEach(() => {
      fsStub.open  = sinon.stub().callsArgWith(2, null, 1);
      fsStub.read  = sinon.stub().callsArgWith(5, null);
      fsStub.close = sinon.stub().callsArgWith(1, null);
    });
    afterEach(() => {
      delete fsStub.open;
      delete fsStub.close;
      delete fsStub.read;
    });
    it('should call fs.open', done => {
      FileUtils.readChunkOfFileToBuff('file', 0, 10)
        .then(() => {
          expect(fsStub.open.calledOnce).is.true;
          expect(fsStub.open.firstCall.args[0]).is.equal('file');
          expect(fsStub.open.firstCall.args[1]).is.equal('r');
          done();
        });
    });
    it('should call fs.read', done => {
      FileUtils.readChunkOfFileToBuff('file', 0, 10)
        .then(() => {
          expect(fsStub.read.calledOnce).is.true;
          expect(fsStub.read.firstCall.args[0]).is.equal(1); // FD returned by stub
          expect(fsStub.read.firstCall.args[1]).to.be.an.instanceof(Buffer);
          expect(fsStub.read.firstCall.args[2]).is.equal(0); // buf start
          expect(fsStub.read.firstCall.args[3]).is.equal(10); // length
          expect(fsStub.read.firstCall.args[4]).is.equal(0); // file start
          done();
        });
    });
    it('should call fs.close', done => {
      FileUtils.readChunkOfFileToBuff('file', 0, 10)
        .then(() => {
          expect(fsStub.close.calledOnce).is.true;
          expect(fsStub.close.firstCall.args[0]).is.equal(1); // FD returned by stub
          done();
        });
    });

    it('should return a end-start sized buffer', done => {
      FileUtils.readChunkOfFileToBuff('file', 2, 10)
        .then(buf => {
          expect(buf.length).is.equal(10 - 2);
          done();
        });
    });

    it('should propagate fs.open error and not call fs.close or read', done => {
      fsStub.open = sinon.stub().callsArgWith(2, new Error('haha'));
      FileUtils.readChunkOfFileToBuff('file', 2, 10)
        .catch(e => {
          expect(e.toString()).to.contain('haha');
          expect(fsStub.close.calledOnce).is.false;
          expect(fsStub.read.calledOnce).is.false;
          done();
        });
    });
    it('should propagate fs.read error and not call close', done => {
      fsStub.read = sinon.stub().callsArgWith(5, new Error('haha'));
      FileUtils.readChunkOfFileToBuff('file', 2, 10)
        .catch(e => {
          expect(e.toString()).to.contain('haha');
          expect(fsStub.close.calledOnce).is.false;
          expect(fsStub.open.calledOnce).is.true;
          done();
        });
    });

    it('should propagate fs.close error ', done => {
      fsStub.close = sinon.stub().callsArgWith(1, new Error('haha'));
      FileUtils.readChunkOfFileToBuff('file', 2, 10)
        .catch(e => {
          expect(e.toString()).to.contain('haha');
          done();
        });
    });
  });
});
