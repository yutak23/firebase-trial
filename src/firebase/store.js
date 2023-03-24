import snakecaseKeys from 'snakecase-keys';
import camelcaseKeys from 'camelcase-keys';

const converter = {
	toFirestore(obj) {
		return snakecaseKeys(obj);
	},
	fromFirestore(snapshot, options) {
		const data = snapshot.data(options);
		return camelcaseKeys(data);
	}
};

// eslint-disable-next-line import/prefer-default-export
export { converter };
