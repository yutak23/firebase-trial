import snakecaseKeys from 'snakecase-keys';
import camelcaseKeys from 'camelcase-keys';

const converter = {
	toFirestore(obj) {
		return snakecaseKeys(obj);
	},
	fromFirestore(snapshot, options) {
		const data = snapshot.data(options);

		Object.keys(data).forEach((key) => {
			if (key === 'date') data.date = data.date.toDate();
		});
		return camelcaseKeys(data);
	}
};

// eslint-disable-next-line import/prefer-default-export
export { converter };
