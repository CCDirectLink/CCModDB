import * as inputLocations from './inputLocations';
import * as source from './source';
import * as db from './db';

async function main() {
	const locations = await inputLocations.parse();
	const promises: Promise<[PkgMetadata, InputLocation]>[] = [];
	for (const loc of locations) {
		promises.push(source.get(loc));
	}
	const packages = await Promise.all(promises);

	const pkgDb = await db.build(packages);
	await db.write(pkgDb);
	await db.writeMods(pkgDb);
}

main().catch(err => console.error('error: ', err));
