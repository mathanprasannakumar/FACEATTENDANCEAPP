const video = document.getElementById('video')
const start = document.getElementById('start')
const stop = document.getElementById('stop')
const In = document.getElementById('in')
const Out = document.getElementById('out')
const canvas = document.getElementById('canva')
const face = document.getElementById('face')
const videobox = document.getElementsByClassName('videobox')[0]
var interval =0
let lx,ly,rx,ry;
let ref_embed;
let in_embed;
let username;
const form = document.getElementsByClassName('usernamebox')[0]
const inputtext = document.getElementById('username')
const submit = document.getElementById('submit')

const formshow = document.getElementById('formshow')
const videoshow = document.getElementById('videoshow')

const modelURL = "/tfjsversion/model.json"

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/faceapimodels')
])

let model  = tf.loadGraphModel(modelURL)

async function verify()
{
  if(window.localStream===undefined)
  {
    window.alert("Please start the camera then predict")
    return
  }
  if(lx && ly && rx && ry)
{
  //drawing the video content on to the canvas
  canvas.getContext('2d').drawImage(video, 0,0,500,500)
  // converting the bytes pixels to tensor from canvas
  let tensor = tf.browser.fromPixels(canvas)
  // normalizing and adding dimension 
  let normalized = tensor.div(tf.scalar(255.0)).expandDims()
  // cropping the face  and resizing it to a optimal size
  let crop =tf.image.cropAndResize(normalized,[[ly,lx,ry,rx]],[0],[160,160])

  //###################
  // for visualization of cropped face
  let vis = crop.squeeze()
  tf.browser.toPixels(vis,face)
  //####################

  model.then(async (model)=>{
    in_embed = await model.predict(crop).data()
  })
  .catch((error)=>{
    console.log(error.message)
  })
}
}

// when caputure button is pressed this whole block will be executed
//##################################################################

  
start.addEventListener('click',() => {
      // debugger;
          // debugger; 
      if(window.localStream===undefined)
      {
          navigator.mediaDevices.getUserMedia({
            video: {width:500,height:500},
            audio:false,
          })
          .then(stream => {
            window.localStream = stream;
            video.srcObject = stream;
          })
          .catch((err) => {
            console.log(err);
          });  
          const displaySize = { width: video.width, height: video.height }

          interval =  setInterval(async () => {
          const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          const resizedDetections = faceapi.resizeResults(detections, displaySize)
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
          faceapi.draw.drawDetections(canvas, resizedDetections)
          resizedDetections.forEach((detections)=>{

              lx = Math.round(detections._box._x)
              ly = Math.round(detections._box._y)
              rx = Math.round(detections._box._width+lx)
              ry = Math.round(detections._box._height+ly)
              lx /=500
              ly/=500
              rx/=500
              ry/=500
              // console.log(lx,ly,rx,ry)

          })
          console.log(interval,"Inside start")
        }, 100)
      }

    })

//#########################################################################

function cd(ref,input)
{
  let a = 0;
  for(var i = 0;i<512;i++)
  {
    a+=ref[i]*input[i]
  }
  let b = input.map((val)=>val*val)
  b = b.reduce((prev,next)=>prev+next)
  let c = ref.map((val)=>val*val)
  c = c.reduce((prev,next)=>prev+next)
  let distance = (1 -(a/(Math.sqrt(b)*Math.sqrt(c))))
  console.log(distance)
  return distance
}


function register(entry)
{
  const xhr = new XMLHttpRequest();
  const data = {username:username,entry:entry}
  console.log(typeof data.entry)
  xhr .open('POST','/entry',true)
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onreadystatechange = ()=>{
    if(xhr.readyState === XMLHttpRequest.DONE){
      if(xhr.status=== 200){

        let result = JSON.parse(xhr.responseText)
        if(result.url) 
        {
          window.location.href=result.url;
        }
      }
      else
      {
        console.error('Request failed with status:'+xhr.status)
      }
    }
  };
  xhr.send(JSON.stringify(data))

}

In.addEventListener('click',()=>{
  if(window.localStream===undefined)
  {
    window.alert("Please turn on your cam")
    return
  }
  verify()
  if(in_embed && ref_embed)
  {
    let distance = cd(in_embed,ref_embed)
    if(distance<=0.5)
    {
      register(In.value)
    }
    else
    {
      window.alert("Not recognised")
    }

  }
  else
  {
    window.alert("Kindly Place your face infront of camera")
  }
})

Out.addEventListener('click',()=>{
  if(window.localStream===undefined)
  {
    window.alert("Please turn on your camera")
    return
  }
  verify()
  if(in_embed && ref_embed)
  {
    let distance = cd(in_embed,ref_embed)
    if( distance <= 0.4)
    {
      register(Out.value)
    }
    else
    {
      window.alert("Not recognized")
    }
  }
  else
  {
    window.alert("Kindly Place your face infront of camera")
  }
})



form.addEventListener('submit',(e)=>{
  e.preventDefault();

  const data = { name : inputtext.value}

  const xhr = new XMLHttpRequest();

  xhr.open('POST','/check',true)
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onreadystatechange = ()=>{
    if(xhr.readyState === XMLHttpRequest.DONE){
      if(xhr.status=== 200){

        let result = JSON.parse(xhr.responseText)
        if(result.url) 
        {
          window.location.href=result.url;
        }
        else
        {
          formshow.style.display='none'
          videoshow.style.display='block'
          const para = document.createElement("p");
          para.innerText = "Take picture for the attendance entry";
          document.body.appendChild(para);
          ref_embed=result.embed
          username=result.username
        }
      }
      else
      {
        console.error('Request failed with status:'+xhr.status)
      }
    }
  };
  xhr.send(JSON.stringify(data))
})


//when the stop button is pressed 
stop.addEventListener('click',()=>
{
    // debugger;
  if(window.localStream !== undefined)
  {
    clearInterval(interval)
    video.pause()
    console.log(interval," stop is pressed " )
    localStream.getVideoTracks()[0].stop();
    localStream=undefined;
    video.src = '';
  }
})
