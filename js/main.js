/*TODO:
  = CHECK ALL FIELDS IN SIGN UP IS FILLED UP AND ADD NOTIFICATION TO USER
  = ADD NOTIFICATION IN LOGIN
  = ADD GOOGLE CALENDAR API
  = ADD GOOGLE MAP API
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
function getCurrentPage(){
  let loc = window.location.href;
  console.log(loc);
}

function userLoggedIn(){
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      return true;
    }
  });
  return false;
}

function getUserType(){
  let accountType = window.location.href.split('?').pop();
  //Just Incase if accountType is not present find the account manually
  if(accountType == "Patient" || accountType == "Doc"){
    return accountType;
  }
  return sessionStorage.getItem("accountType");
}

//store data in storageSession for faster loading time
function storeData(accountInfo){
  sessionStorage.setItem("name", accountInfo.name);
  sessionStorage.setItem("age", accountInfo.age);
  sessionStorage.setItem("gender", accountInfo.gender);
  sessionStorage.setItem("contact", accountInfo.contact);
  sessionStorage.setItem("accountType", accountInfo.accountType);
  sessionStorage.setItem("record", accountInfo.record);
  if(accountInfo.accountType == "Doc"){
    sessionStorage.setItem("clinicName", accountInfo.clinicName);
    sessionStorage.setItem("clinicAddress", accountInfo.clinicAddress);
  }
}

function getUserData(){
  let accountInfo = {};
  accountInfo.name = sessionStorage.getItem("name");
  accountInfo.age = sessionStorage.getItem("age");
  accountInfo.gender = sessionStorage.getItem("gender");
  accountInfo.contact = sessionStorage.getItem("contact");
  accountInfo.accountType = sessionStorage.getItem("accountType");
  accountInfo.record = sessionStorage.getItem("record");
  if(accountInfo.accountType == "Doc"){
    accountInfo.clinicName = sessionStorage.getItem("clinicName");
    accountInfo.clinicAddress = sessionStorage.getItem("clinicAddress");
  }
  return accountInfo;
}

async function changePageDetails(){
  if(userLoggedIn){
    let userData = await getUserData();
    let accountType = await getUserType();
    //Homepage
    if(userNameHomepage != null){
      userNameHomepage.textContent = userData.name;

      if(accountType == "Patient"){
        userInfoHomepage.textContent = userData.age + ", " + userData.gender;
      }
      else{
        userInfoHomepage.textContent = userData.clinicName + ", " + userData.clinicAddress;
      }
    }

    //MedicalRecordsPage
    if(patientRecordPage != null){
      patientRecordPage.style.backgroundRepeat = "no-repeat";
      patientRecordPage.style.backgroundSize = "100% 100%";
      patientRecordPage.style.backgroundImage = "url(" + userData.record + ")";
      console.log( "url(" + userData.record + ")");
    }
  }
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