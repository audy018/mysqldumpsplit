import Splitter from 'streamsplit';
import FileUtils from './FileUtils.class.js';
import path from 'path';
import fs from 'fs';
import { Observable } from 'rxjs';

const splitToken       = '\n--\n-- Table structure for table';
const splitTokenLength = splitToken.length;

export default function (fullFilePath, outputPath = path.dirname(fullFilePath)) {
  return Splitter.split(
    {
      stream        : fs.createReadStream(fullFilePath),
      token         : splitToken,
      noEmptyMatches: true
    })
    .flatMap(({ start, end }, idx) => Observable.fromPromise(
      FileUtils.readChunkOfFileToBuff(
        fullFilePath,
        start - splitTokenLength,
        start - splitTokenLength + splitTokenLength * 4 // safe guess :)
      )
      )
      .flatMap(chunk => {
        const matches = /for table `(.*?)`/.exec(chunk.toString('utf8'));
        if (matches !== null && matches.length > 0) {
          return Observable.of(matches[1]);
        }
        return Observable.of(`_unknown_${idx}`);
      })
      .flatMap(tableName => {
        const fileExt = path.extname(fullFilePath);
        return Observable.fromPromise(
          FileUtils.copyChunkOfFileToAnother(
            start > 0 ? start - splitTokenLength : 0,
            end,
            fullFilePath,
            path.join(
              outputPath,
              `${path.basename(fullFilePath, fileExt)}-${tableName}${fileExt}`
            )
          )
        );
      })
  );
}
