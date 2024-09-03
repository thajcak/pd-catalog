const URL_CATALOG = 'https://playdate-activepieces.0yxtg2.easypanel.host/api/v1/webhooks/AGUpFzl2u0zyipQz5OWvm/sync';


document.addEventListener('DOMContentLoaded', () => {
	getCatalogHome();
});

const getCatalogHome = async () => {
	const localStorageKey = 'catalogData';

	// Function to fetch data from the REST API
	const fetchCatalogData = async () => {
		try {
			const response = await fetch('./catalog.json');
			const data = await response.json();
			localStorage.setItem(localStorageKey, JSON.stringify(data));
			return data;
		} catch (error) {
			console.error('Catalog Error', error);
			return null;
		}
	};

	// Function to get data from localStorage or fetch if not present
	const getCatalogData = async () => {
		const localData = localStorage.getItem(localStorageKey);
		if (localData) {
			console.log('Using local data');
			return JSON.parse(localData);
		} else {
			console.log('Fetching new data');
			return await fetchCatalogData();
		}
	};

	// Use the data to populate the catalog home
	const catalogData = await getCatalogData();
	if (catalogData) {
		const catalogHome = document.getElementById('catalog-home');
		catalogHome.innerHTML = '';

		catalogData.forEach(item => {
			let itemElement = document.createElement('div');
			itemElement.setAttribute('class', ('list-image-' + item.list_image_size));
			let imageElement = document.createElement('img');
			getImage(imageElement, item.list_image);
			itemElement.appendChild(imageElement);
			catalogHome.appendChild(itemElement);
		});
	}
};

function clearCache() {
	localStorage.removeItem('catalogData');
	const catalogHome = document.getElementById('catalog-home');
	catalogHome.innerHTML = 'Loading...';
	getCatalogHome();
}