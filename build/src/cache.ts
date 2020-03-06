import stream from 'stream';
import fs from 'fs';
import crypto from 'crypto';

// Do not use cache for files that were not there when the execution started because it always goes wrong for some reason. If you can make it work, feel free to do so.
const excluded: string[] = [];

export async function get(tag: string): Promise<stream.Readable | undefined> {
	if (!await has(tag)) {
		return undefined;
	}

	return fs.createReadStream(file(tag));
}

export async function put(tag: string, content: stream.Readable): Promise<void> {
	if (await has(tag)) {
		return;
	}

	createDir();

	excluded.push(tag);
	await new Promise<void>((resolve, reject) => {
		const fstream = fs.createWriteStream(file(tag));
		content
			.on('error', err => reject(err))
			.on('end', () => {
				fstream.close();
				resolve();
			})
			.pipe(fstream, {end: true});
	});
}

export async function has(tag: string): Promise<boolean> {
	if (tag === '' || excluded.includes(tag)) {
		return false;
	}

	return new Promise<boolean>((resolve) => {
		fs.stat(file(tag), (err, stat) => {
			if (err || !stat) {
				return resolve(false);
			}
			resolve(stat.isFile());
		});
	});
}

function createDir(): Promise<void> {
	return new Promise(resolve => fs.mkdir('./cache/', () => resolve()));
}


function file(tag: string): string {
	return './cache/' + hash(tag) + '.cache';
}

function hash(tag: string): string {
	return crypto.createHash('sha256', {encoding: 'utf8'})
		.update(tag, 'utf8')
		.digest('hex');
}
