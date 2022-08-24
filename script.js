'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapev;
  #workouts = []; //to store all workouts
  constructor() {
    this._getposition();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevantion.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _loadmap(position) {
    // const latitude  = position.coords.latitude
    // const longitude  = position.coords.longitude
    //Alternatively..
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    //URL of my current location

    this.#map = L.map('map').setView(coords, 13); //13 for zooming in and out

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showform.bind(this));
    //get data from the localstorage
    this._getLocalStorageData();
  }

  _getposition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadmap.bind(this),
        function () {
          alert(
            'Could not fetch your location, kindly check your location settings.'
          );
        }
      );
    }
  }

  _newWorkout(e) {
    //this will return true only if all the inputs are valid positive number;
    //clearing all the inputs
    const validateInputs = (...inputs) =>
      inputs.every(inputeach => Number.isFinite(inputeach));

    //To check for positive numbers only
    const allPositive = (...inputs) => inputs.every(input1 => input1 > 0);

    e.preventDefault(); //to avoid refreshing the screen
    //Get data from the form
    const type = inputType.value;
    const duration = Number(inputDuration.value);
    const distance = Number(inputDistance.value);
    const { lat, lng } = this.#mapev.latlng;
    let workout;
    //validate the inputs

    //If workout is running then create running object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      if (
        !validateInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Enter a valid positive number');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout is cycling then create cycling object
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      if (
        !validateInputs(distance, duration, elevation) ||
        !allPositive(distance, duration) //elevation can be -ve so lets not check it
      )
        return alert('Enter a valid distance');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add the workout in the array
    this.#workouts.push(workout);

    //Render workout on map as a marker
    this.renderWorkputMarker(workout);

    //Render workout in list
    this._renderWorkout(workout);

    //clear
    this._hideform();

    //Store the workout in the local storage
    this._setLocalStorage();
  }

  _showform(ev) {
    this.#mapev = ev;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideform() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevantion() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  renderWorkputMarker(workout) {
    // let markerContent = ;

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      } </span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
      </div>
     `;
    if (workout.type === 'running') {
      html += ` <div class="workout__details">
     <span class="workout__icon">⚡️</span>
     <span class="workout__value">${workout.pace.toFixed(1)}</span>
     <span class="workout__unit">min/km</span>
     </div>
     <div class="workout__details">
     <span class="workout__icon">🦶🏼</span>
     <span class="workout__value">${workout.cadence}</span>
     <span class="workout__unit">spm</span>
     </div>
     </li>`;
    }
    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const ClickedItem = e.target.closest('.workout');

    if (!ClickedItem) return;
    const clickedWorkout = this.#workouts.find(
      workout => workout.id === ClickedItem.dataset.id
    );
    this.#map.setView(clickedWorkout.coords, 13, {
      animation: true,
      pan: {
        duration: 1,
      },
    });

    //clickedWorkout.clicks();
  }
  _setLocalStorage() {
    localStorage.setItem('workoutsLS', JSON.stringify(this.#workouts)); //Converting the objects into a string using Stringify
  }
  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workoutsLS'));

    if (!data) return;
    data.forEach(element => {
      this.#workouts = data;
      this._renderWorkout(element);
      this.renderWorkputMarker(element);
    });
  }
}

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  //click = 0;
  //now() is a static method of the Date object. It returns the value in milliseconds that represents the time elapsed since the Epoch.
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setdescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  // clicks() {
  //   this.click++;
  // }
}
class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.type = 'running';
    this.calcPace();
    this._setdescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.type = 'cycling';
    this.calcSpeed();
    this._setdescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km/hr since its in mins convert to hour
    return this.speed;
  }
}
const firstapp = new App();
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycle1);
