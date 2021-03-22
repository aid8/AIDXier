/*TODO:
  = CHECK ALL FIELDS IN SIGN UP IS FILLED UP AND ADD NOTIFICATION TO USER
  = ADD NOTIFICATION IN LOGIN
  = IN SETTING APPOINTMENTS, ADD AS WELL TO GOOGLE CALENDAR, CHECK IF DATE AND TIME WILL CONFLICT
  = ADD GOOGLE MAP API
  = DO NOT DIRECTLY GO TO LOGIN.HTML, must have ?patient or ?doc
  = IF LOGGED IN, DO NOT GO TO LOGIN.HTML nor signup, vice versa
*/

const config = {
  apiKey: 'AIzaSyDbE43EtFgQ8K8H42uFBQLdG6903_d4hhw',
  authDomain: 'aidxier-19a98.firebaseapp.com',
  projectId: 'aidxier-19a98',
  storageBucket: 'aidxier-19a98.appspot.com',
  messagingSenderId: '385746246531',
  appId: '1:385746246531:web:dcfb7e8d9ea77d056634b6',
};

const googleCalConfig ={
    // Client ID and API key from the Developer Console
    CLIENT_ID: '998172243350-5vsbb7ifb30drpcvmhp0qtp6b3a2oogp.apps.googleusercontent.com',
    API_KEY: 'AIzaSyBjN4VfHYNYr2ofChNHvnHR8jbmUZM5uLo',
    // Array of API discovery doc URLs for APIs used by the quickstart
    DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
    // Authorization scopes required by the API; multiple scopes can be
    // included, separated by spaces.
    SCOPES: "https://www.googleapis.com/auth/calendar"
};

firebase.initializeApp(config);
const firestore = firebase.firestore();

//----------GLOBAL VARIABLES----------//
/*
  May slowdown page due to many global variabes
  Some variables can be local variables
*/
const signUpForm = document.querySelector('#signUpForm');
const loginForm = document.querySelector('#loginForm')
const logoutBtn = document.querySelector('#logoutBtn');
const postSubmit = document.querySelector('#postSubmit');
const progressBarForm = document.querySelector('#progressBarForm');
const progressHandlerForm = document.querySelector('#progressHandlerForm');

const titleSignUp = document.querySelector('#titleSignUp');
const userNameHomepage = document.querySelector('#userNameHomepage');
const userInfoHomepage = document.querySelector('#userInfoHomepage');
const patientRecordPage = document.querySelector('#patientRecord');
const setAppointmentDiv = document.querySelector('#setAppointmentDiv');
const googleCalSignInBtn = document.querySelector('#googleCalSignInBtn');
const googleCalSignOutBtn = document.querySelector('#googleCalSignOutBtn');
const googleCalSignInDiv = document.querySelector('#googleCalSignInDiv');
const googleCalEventDiv = document.querySelector('#googleCalEventDiv');
const setAppointmentSubmitBtn = document.querySelector('#setAppointmentSubmitBtn');
const pendingAppointmentDiv = document.querySelector('#pendingAppointmentDiv');
const browseClinicsDiv = document.querySelector('#browseClinicsDiv');
const previousAppointmentsDiv = document.querySelector('#previousAppointmentsDiv');

//----------USERS SIGN UP----------//
if (signUpForm != null) {
  let d, uid;
  const accountType = window.location.href.split('?').pop();

  //Hide Info of Doctors sign up in patients sign up
  if(accountType == "Patient"){
    let clinicNameDiv = document.querySelector('#clinicNameInputDiv');
    let clinicAddressDiv = document.querySelector('#clinicAddressInputDiv');
    clinicNameDiv.style.display = 'none';
    clinicAddressDiv.style.display = 'none';
  }

  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault(); //Prevent refresh
    let name = document.getElementById('nameInput').value;
    let age = document.getElementById('ageInput').value;
    let gender = (document.getElementById('genderMaleInput').value == "male") ? "Male" : "Female";
    let clinicName = document.getElementById('clinicNameInput').value;
    let clinicAddress = document.getElementById('clinicAddressInput').value;
    let email = document.getElementById('emailInput').value;
    let pass = document.getElementById('passwordInput').value;
    let contact = document.getElementById('contactInput').value;
    let record = document.getElementById('recordInput').files[0];
    let auth = firebase.auth();
    let fieldsOk = true;
    
    //TODO : CHECK IF ALL FIELDS ARE OK
    if(fieldsOk){
      //Show Progess Bar
      progressHandlerForm.style.display = 'block';

      const storageRef = firebase.storage().ref();
      const storageChild = storageRef.child(record.name);

      //Upload the file(record)
      const postCover = storageChild.put(record);

      //Wait for the file(record) to be Uploaded
      await new Promise((resolve) => {
        postCover.on('stage_changed',(snapshot) => {
          let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(Math.trunc(progress));
          
          progressHandlerForm.style.display = true;
          progressBarForm.value = progress;
          postSubmit.disabled = true;
        },
        (error) => {
          //Add element to show error upon uploading
          console.log(error);
        },
        async () => {
          const downloadURL = await storageChild.getDownloadURL();
          d = downloadURL;
          console.log(d);
          //tell everything is done (exit await)
          resolve();
        });
      });
        
      const fileRef = await firebase.storage().refFromURL(d);

      //After uploading file (record), Create account in firebase auth and upload other info in storage
      auth.createUserWithEmailAndPassword(email, pass)
      .then(async(user) => {
        uid = auth.currentUser.uid;
        let accountInfo = {
          uid,
          name,
          age,
          gender,
          contact,
          accountType,
          record: d,
          appointments: [],
          prevAppointments: [],
          fileref: fileRef.toString(),
        };

        if(accountType == 'Patient') {
          await firebase.firestore().collection('patient-accounts-info').doc(uid).set(accountInfo);
        } 
        else{
          accountInfo["clinicName"] = clinicName;
          accountInfo["clinicAddress"] = clinicAddress;
          await firebase.firestore().collection('doc-accounts-info').doc(uid).set(accountInfo);
        }

        //After a success sign up, go to homepage
        if (postSubmit != null) {
          storeData(accountInfo);
          gotoPage("homepage", accountType);
          postSubmit.disabled = false;
        }
      })
      //if there are any errors in adding account (e.g. invalid email format)
      .catch(function(ce){
        console.log(ce.message);
        postSubmit.disabled = false;
      });
    }
    else{
      //If there is a missing field or data
      //ADD a warning
      console.log('Please Input all fields!');
    }
  });
}

//----------USERS LOG IN----------//
if(loginForm != null){
  loginForm.addEventListener('submit', async(e) =>{
    e.preventDefault(); //Prevent refresh
    let email = document.getElementById('emailInput').value;
    let pass = document.getElementById('passwordInput').value;
    let auth = firebase.auth();

    //Sign in
    auth.signInWithEmailAndPassword(email, pass)
    .then(async(userAuth) => {
      let collection;
      let data = await new Promise(resolve =>{
        firebase.auth().onAuthStateChanged(async(user) =>{
          if(user){
            collection = (await getUserType() == "Patient") ? "patient" : "doc";
            firestore.collection(collection+"-accounts-info").doc(user.uid).get().then((doc)=>{
              if(doc.exists){
                resolve(doc.data());
              }
            });
          }
        });
      });
      
      storeData(data);
      gotoPage("homepage", getUserType());
    })
    //if account not found
    .catch(function(ce){
      console.log(ce.message);
    });
  });
}

//----------CHANGE DATA ACC TO USER OR ACC----------//
//=====SIGNUP FORMS====//
if (titleSignUp != null) {
  let id = window.location.href.split('?').pop();
  let title = 'SIGN UP AS ';
  title += id == 'Patient' ? 'PATIENT' : 'MEDICAL PRACTICIONER';
  titleSignUp.textContent = title;
  if (id != 'Patient') {
    document.querySelector('#recordInputText').textContent = 'Medical Practitioner Certificate';
  }
}

//=====HOMEPAGE FORMS====//
if(logoutBtn != null){
  logoutBtn.addEventListener('click', e=>{
    firebase.auth().signOut();
    sessionStorage.clear();
    gotoPage("index");
  });
}
changePageDetails();

//----------FUNCTIONS----------//
function gotoPage(page, accountType){
  let homepageURL = (accountType == 'Patient') ? "patient/" : "medical-practitioner/";
  switch(page){
    case "homepage":
      window.location.replace("/pages/"+homepageURL+page+".html");
    break;

    case "index":
      window.location.replace("/index.html");
    break;

    default:
  }
}

//Only showing the current link
//Fix if needed
function getCurrentPage(){
  let loc = window.location.href;
  console.log(loc);
}

function reloadPage(){
  location.reload();
}

function getUserType(){
  let accountType = window.location.href.split('?').pop();
  //Just Incase if accountType is not present find the account manually
  if(accountType == "Patient" || accountType == "Doc"){
    return accountType;
  }
  return getUserData().accountType;
}

//store data in storageSession for faster loading time
function storeData(accountInfo){
  sessionStorage.setItem("accountInfo",JSON.stringify(accountInfo));
}

function getUserData(){
  return JSON.parse(sessionStorage.getItem("accountInfo"));
}

async function reloadData(){
  let collection;
  let data = await new Promise(resolve =>{
    firebase.auth().onAuthStateChanged(async(user) =>{
      if(user){
        collection = (await getUserType() == "Patient") ? "patient" : "doc";
        firestore.collection(collection+"-accounts-info").doc(user.uid).get().then((doc)=>{
          if(doc.exists){
            resolve(doc.data());
          }
        });
      }
    });
  });
  storeData(data);
}

async function getClinics(){
  let clinics = new Set();
  let docs = await firestore.collection("doc-accounts-info").get();
  docs.forEach(doc =>{
    clinics.add(doc.data().clinicName);
  });
  return clinics;
}

async function getDoctorInfos(){
  let doctors = [];
  let docs = await firestore.collection("doc-accounts-info").get();
  docs.forEach(doc =>{
    doctors.push(doc.data());
  });
  return doctors;
}

async function addAppointment(date, symptom, clinicSelected){
  let userData = getUserData();
  let dataRef = await firebase.firestore().collection('patient-accounts-info').doc(userData.uid);
  let currentAppointments = userData.appointments;
  currentAppointments.push(JSON.parse(JSON.stringify({
    date,
    symptom,
    clinicSelected,
    viewed: false,
    approved: false,
    patientUid: userData.uid,
    details:""
  })));
  dataRef.update({appointments: currentAppointments});
  await reloadData();
  reloadPage();
}

//Soon add functions that will be able to cancel multiple appointments
async function cancelAppointment(){
  let dataRef = await firebase.firestore().collection('patient-accounts-info').doc(getUserData().uid);
  dataRef.update({appointments: []});
  await reloadData();
  reloadPage();
}

function changePageDetails(){
  firebase.auth().onAuthStateChanged(async(user) => {
    if(user){
      let userData = await getUserData();
      let accountType = await getUserType();
      //=====Homepage=====//
      if(userNameHomepage != null){
        userNameHomepage.textContent = userData.name;
        if(accountType == "Patient"){
          userInfoHomepage.textContent = String(userData.age) + ", " + userData.gender;
        }
        else{
          userInfoHomepage.textContent = userData.clinicName + ", " + userData.clinicAddress;
        }
      }

      //=====Medical Records=====//
      if(patientRecordPage != null){
        patientRecordPage.style.backgroundRepeat = "no-repeat";
        patientRecordPage.style.backgroundSize = "100% 100%";
        patientRecordPage.style.backgroundImage = "url(" + userData.record + ")";
      }

      //=====Set-Appointment=====//
      if(userData){
        if(userData.appointments.length <= 0){
          if(setAppointmentDiv != null) setAppointmentDiv.style.display = 'block';
          if(pendingAppointmentDiv != null) pendingAppointmentDiv.style.display = 'none';
        }
        else{
          if(setAppointmentDiv != null) setAppointmentDiv.style.display = 'none';
          if(pendingAppointmentDiv != null) pendingAppointmentDiv.style.display = 'block';
        }
      }

      if(setAppointmentDiv != null){
        if(setAppointmentDiv.style.display != 'none'){
          let clinicChooseSelect = document.getElementById('clinicChooseSelect');
          let date = document.getElementById('dateInput');
          let symptom = document.getElementById('symptomInput');
          let clinics = await getClinics();
          clinics.forEach(clinic =>{
            var option = document.createElement("option");
            option.text = clinic;
            option.value = clinic;
            clinicChooseSelect.add(option);
          });

          googleCalSignOutBtn.style.display = 'none';
          googleCalEventDiv.style.display = 'none';
          handleClientLoad();
    
          setAppointmentSubmitBtn.addEventListener('click', async(e) =>{
            e.preventDefault();
            let selectOption = clinicChooseSelect.options[clinicChooseSelect.selectedIndex];
            let clinicSelected = selectOption.getAttribute("value");
            await addAppointment(date.value,symptom.value,clinicSelected);
          });
        }
      }

      if(pendingAppointmentDiv != null){
        if(pendingAppointmentDiv.style.display != 'none'){
          reloadData();
          let pendingStatusTitle = document.getElementById('pendingStatusTitle');
          let clinicDetailsPendingTitle = document.getElementById('clinicDetailsPendingTitle');
          let appointmentSchedulePendingPar = document.getElementById('appointmentSchedulePendingPar');
          let appointmentSymptomPendingPar = document.getElementById('appointmentSymptomPendingPar');
          let appointmentPendingBtn = document.getElementById('appointmentPendingBtn');
          let responseDetailsPar = document.getElementById('responseDetailsPar');

          clinicDetailsPendingTitle.innerHTML = userData.appointments[0].clinicSelected;
          appointmentSchedulePendingPar.innerHTML = "Schedule: " + userData.appointments[0].date;
          appointmentSymptomPendingPar.innerHTML = "Symptom: " + userData.appointments[0].symptom;
          if(userData.appointments[0].viewed){
            let approved = userData.appointments[0].approved;
            pendingStatusTitle.innerHTML = "Response Recived: " + (approved ? 'Approved' : 'Declined');
            responseDetailsPar.innerHTML = "Details: " + userData.appointments[0].details;
            appointmentPendingBtn.innerHTML = (approved ? '' : 'Close');
            appointmentPendingBtn.style.display = (approved ? 'none' : 'block');
          }
          else{
            pendingStatusTitle.innerHTML = 'Pending response from';
            appointmentPendingBtn.style.display = 'block';
            appointmentPendingBtn.innerHTML = 'Cancel Appointment';
          }
          appointmentPendingBtn.addEventListener('click', e=>{cancelAppointment();});
        }
      }

      //=====Browse Clinic=====//
      if(browseClinicsDiv != null){
        var doctors = await getDoctorInfos();
        doctors.forEach(function(doctor, i){
          var divCard = document.createElement('div');
          var divCardBody = document.createElement('div');
          var pCardBody = document.createElement('p');
          var breakLine = document.createElement('br');

          pCardBody.innerHTML = doctor.name + " / " + doctor.clinicName;
          divCard.className = "card";
          divCardBody.className = "card-body";
          pCardBody.className = "card-text";

          divCardBody.appendChild(pCardBody);
          divCardBody.insertAdjacentHTML('beforeEnd','<a class="card-link" data-bs-toggle="modal" data-bs-target="#clinicDetailModal" data-bs-index="' + i +'">More Details</a>');
          divCard.appendChild(divCardBody);
          browseClinicsDiv.appendChild(divCard);
          browseClinicsDiv.appendChild(breakLine);
        });

        var clinicDetailModal = document.getElementById('clinicDetailModal')
        clinicDetailModal.addEventListener('show.bs.modal', function (event) {
          // Button that triggered the modal
          var button = event.relatedTarget;
          // Extract info from data-bs-* attributes
          var index = button.getAttribute('data-bs-index');
          var selectedDoctor = doctors[index];
          var modalTitle = clinicDetailModal.querySelector('.modal-title')
          var modalBodyInput = clinicDetailModal.querySelector('.modal-body')

          modalTitle.textContent = selectedDoctor.clinicName;
          modalBodyInput.innerHTML = "Doctor: " + selectedDoctor.name + "<br/>Address: " + selectedDoctor.clinicAddress;
        });
      }

      //=====View Previous Appointments=====//
      if(previousAppointmentsDiv != null){
        //TODO HERE
        let prevAppointmentsData = await getUserData().prevAppointments;
        if(prevAppointmentsData.length == 0){
          var p = document.createElement('p');
          p.className = "d-flex justify-content-center";
          p.innerHTML = "<br/><br/>No Previous Appointments!";
          previousAppointmentsDiv.appendChild(p);
        }
        else{
          prevAppointmentsData.forEach(function(data, i){
            var divCard = document.createElement('div');
            var divCardBody = document.createElement('div');
            var pCardBody = document.createElement('p');
            var breakLine = document.createElement('br');
           
            pCardBody.innerHTML = data.date + " / " + data.clinicSelected;
            divCard.className = "card";
            divCardBody.className = "card-body";
            pCardBody.className = "card-text";
  
            divCardBody.appendChild(pCardBody);
            divCardBody.insertAdjacentHTML('beforeEnd','<a class="card-link" data-bs-toggle="modal" data-bs-target="#prevAppointmentModal" data-bs-index="' + i +'">More Details</a>');
            divCard.appendChild(divCardBody);
            previousAppointmentsDiv.appendChild(divCard);
            previousAppointmentsDiv.appendChild(breakLine);
          });

          var prevAppointmentModal = document.getElementById('prevAppointmentModal')
          prevAppointmentModal.addEventListener('show.bs.modal', function (event) {
            var button = event.relatedTarget;
            var index = button.getAttribute('data-bs-index');
            var selectedAppointment = prevAppointmentsData[index];
            var modalBodyInput = prevAppointmentModal.querySelector('.modal-body')
            modalBodyInput.innerHTML = "Clinic: " + selectedAppointment.clinicSelected + "<br/>Date: " + selectedAppointment.date
            + "<br/>Symptom: " + selectedAppointment.symptom + "<br/>Status: " + (selectedAppointment.approved ? "Approved" : "Declined");
          });
        }
      }
    }
  });
}

//=====GOOGLE CALENDAR FUNCTIONS====//
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

function initClient() {
  gapi.client.init({
    apiKey: googleCalConfig.API_KEY,
    clientId: googleCalConfig.CLIENT_ID,
    discoveryDocs: googleCalConfig. DISCOVERY_DOCS,
    scope: googleCalConfig.SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
   
    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    googleCalSignInBtn.onclick = handleAuthClick;
    googleCalSignOutBtn.onclick = handleSignoutClick;
  }, function(error) {
    console.log(JSON.stringify(error, null, 2));
  });
}

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    googleCalSignInDiv.style.display = 'none';
    googleCalSignOutBtn.style.display = 'block';
    googleCalEventDiv.style.display = 'block';
    showCalendar();
  } else {
    googleCalEventDiv.style.display = 'none';
    googleCalSignOutBtn.style.display = 'none';
    googleCalSignInDiv.style.display = 'block';
  }
}

function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
  reloadPage();
}

function showCalendar() {
  let profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
  let userEmail = profile.getEmail();
  let calendarIframe = '<iframe src="https://www.google.com/calendar/embed?height=600&amp;wkst=1&amp;bgcolor=%23FFFFFF&amp;src=' + userEmail + '&amp;color=%232952A3&amp; style=" border-width:0 " width="100%" height="400" frameborder="0" scrolling="no"></iframe>';
  googleCalEventDiv.style.display = 'block';
  googleCalEventDiv.innerHTML = calendarIframe;
}

//----------FIREBASE REALTIME LISTENER----------//
firebase.auth().onAuthStateChanged(user =>{
  if(user){
    console.log("logged in" + user.uid);
  }
  else{
    console.log("not logged in");
  }
});