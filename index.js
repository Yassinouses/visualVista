const express = require("express");
const Botly = require("botly");
const axios = require("axios");
const request = require("request");
const querystring = require("querystring");
const cheerio = require("cheerio");
const fs = require("fs");
const FormData = require("form-data");
const app = express();
const https = require("https");
const { createClient } = require("@supabase/supabase-js");
//const schedule = require("node-schedule");


const supabase = createClient(
  "https://byhvjfuafvkhbjxirfbm.supabase.co",
  process.env.KEY,
  { auth: { persistSession: false } },
);
/*____api_data______*/

const url = "https://cognise.art/api/mobile/txt2img/generate/v2";
const headers = {
  Authorization: "token d8ec334912121e3bc1208a86e92328bc3922a38d",
  "Content-Type": "application/x-www-form-urlencoded",
};

const data = new URLSearchParams();

/*------api_data-------*/

function keepAppRunning() {
  setInterval(
    () => {
      https.get(
        `${process.env.RENDER_EXTERNAL_URL}/ping`,
        //  "https://c1de82b2-aea7-4333-b3a6-14348c1d0f1b-00-cihd67ki3snb.riker.replit.dev/"
        (resp) => {
          if (resp.statusCode === 200) {
            console.log("Ping successful");
          } else {
            console.error("Ping failed");
          }
        },
      );
    },
    5 * 60 * 1000,
  ); // 5 minutes in milliseconds
}

const botly = new Botly({
  accessToken: process.env.TOKEN,
  notificationType: Botly.CONST.REGULAR,
  FB_URL: "https://graph.facebook.com/v2.6/",
});

/* ---- ESS ---- */

app.get("/", (req, res) => {
  res.sendStatus(200);
});

app.get("/ping", (req, res) => {
  res.status(200).json({ message: "Ping successful" });
});

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.post("/webhook", (req, res) => {
  // console.log(req.body)
  if (req.body.message) {
    onMessage(req.body.message.sender.id, req.body.message);
  } else if (req.body.postback) {
    onPostBack(
      req.body.postback.message.sender.id,
      req.body.postback.message,
      req.body.postback.postback,
    );
  }
  res.sendStatus(200);
});

/* ---- ESS ---- */

/*------timer checking------

const rawData = fs.readFileSync("./imagine_database2.json");
const useData = JSON.parse(rawData);

// Check each user's timer value
useData.users.forEach((user) => {
  if (user.timer > 0) {
    // console.log(`Countdown for Sender ID ${user.senderId}`);

    user.resumetimer = true;
    user.waiting = true;
  }
  if (user.imgtimer > 0) {
    user.imgwaiting = true;
    user.resumeimgtimer = true;
  }

  // Perform your countdown action here for users with timer > 0
  // You can add specific actions or further logic for each user with a timer > 0
});
fs.writeFileSync("./imagine_database2.json", JSON.stringify(useData, null, 1));

------ timer checking ------*/

/* ---- DATABASE ---- */

//const userData = require("./imagine_database2.json");

/*async function checkSenderId(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('senderId', userId);
      .single();
    if (error) {
      console.error('Error checking user:', error);
    } else {
      return data
    }
};*/

async function checkSenderId(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("senderId", userId)
    .single();

  return data;
}

async function createUser(user) {
  const { data, error } = await supabase.from("users").insert([user]);

  if (error) {
    throw new Error("Error creating user : ", error);
  } else {
    return data;
  }
}

async function updateUser(id, update) {
  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("senderId", id);

  if (error) {
    throw new Error("Error updating user : ", error);
  } else {
    return data;
  }
}

/* ---- DATABASE ---- */

async function processUsers() {
  // Fetch user data from Supabase
  const { data: allUsers, error } = await supabase.from("users").select("*");

  if (error) {
    console.error("Error fetching user data:", error);
    return;
  }

  // Check each user's timer value
  allUsers.forEach(async (user) => {
    if (user.timer > 0) {
      // Perform your countdown action here for users with timer > 0
      // You can add specific actions or further logic for each user with a timer > 0

      // Update user data in the Supabase database
      const updateData = {
        resumetimer: true,
        waiting: true,
      };
      await updateUser(user.senderId, updateData);
    }

    if (user.imgtimer > 0) {
      // Update user data in the Supabase database
      const updateData = {
        imgwaiting: true,
        resumeimgtimer: true,
      };
      await updateUser(user.senderId, updateData);
    }
  });

  // No need to write back to the JSON file, as the data is updated in the Supabase database
}

// Call the asynchronous function
processUsers();

const onMessage = async (senderId, message) => {
  const user = await checkSenderId(senderId);
  if (!user) {
    // no user
    const newUser = {
      senderId: senderId,
      context: null,
      choose: true,
      cont: false,
      styleid: null,
      waiting: false,
      timer: 0,
      resumetimer: false,
      imgtimer: 0,
      resumeimgtimer: false,
      imgwaiting: false,
      imgcont: true,
      messenger: true,
      lite: false,
      img_ratio: "cover",
    };

    await createUser(newUser).then(() => {
      botly.sendButtons({
        id: senderId,
        text: "مرحبا 👋\n انا بوت 🤖 لتوليد الصور  🌇 ب 12 ستايل مختلف 🏙️  اضغط زر [البدأ 🔵 ] لتحديد الستايل الذي تريده  \n ايضا يمكنني التعرف على الصور 🌁 التي ترسلها لي 📥   ",
        buttons: [
          botly.createPostbackButton("البدأ 🔵", "123"),
          // Add more buttons as needed
        ],
      });
    });
  } else {
    /*if (user.styleid = null) {
      await updateUser(senderId, {
       styleid : "5",
      });
    }*/
    if (user.resumetimer) {
      countdown(senderId, user);

      await updateUser(senderId, {
        resumetimer: false,
      });
    }
    if (user.resumeimgtimer) {
      countdownimg(senderId, user);
      await updateUser(senderId, {
        resumeimgtimer: false,
      });
    }

    async function countdown(senderId, user) {
      //console.log("im on ");
      for (let i = 30; i >= 0; i--) {
       // console.log(i);
        updateUser(senderId, {
          //  timer: user.timer - 1,
          timer: i,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // await new Promise((resolve) => setTimeout(resolve, user.timer * 1000));
      await updateUser(senderId, {
        cont: true,
        waiting: false,
      });

      const quickReplies = [
        {
          content_type: "text",
          title: "تغيير الستايل",
          payload: "OPTION_1_PAYLOAD",
        },
        {
          content_type: "text",
          title: "الاعدادات",
          payload: "OPTIONPAYLOAD",
        },
      ];

      botly.send({
        id: senderId,
        message: {
          text: "⏰ انتهت ✅ مدة الانتظار 💤 يمكنك ارسال نص جديد 📝",
          quick_replies: quickReplies,
        },
      });
    }

    async function countdownimg(senderId, user) {
      for (let i = 30; i >= 0; i--) {
        //console.log("img", i);
        await updateUser(senderId, {
          imgtimer: i,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await updateUser(senderId, {
        imgcont: true,
        imgwaiting: false,
      });

      const quickReplies = [
        {
          content_type: "text",
          title: "تغيير الستايل",
          payload: "OPTION_1_PAYLOAD",
        },
        {
          content_type: "text",
          title: "الاعدادات",
          payload: "OPTIONAYLOAD",
        },
      ];

      botly.send({
        id: senderId,
        message: {
          text: "⏰ انتهت ✅ مدة الانتظار 💤 يمكنك ار �ال صورة جديدة 🌇",
          quick_replies: quickReplies,
        },
      });
    }

    function isArabic(text) {
      var arabicPattern =
        /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
      return arabicPattern.test(text);
    }
    if (user.styleid === null) {
      botly.sendText({
        id: senderId,
        text: `
            يرجى الضغط على زر [البدأ🔵] او اختيار الستايل🪧
              `,
      });
    }

    if (message.message.text) {
      const forbiddenWords = [
        "قضيب",
        "Penis",
        "عاري",
        "Naked",
        "جنس",
        "Sex",
        "سكس",
        "Sexual",
        "غير لائق",
        "Inappropriate",
        "إباحي",
        "Pornographic",
        "فاحش",
        "Obscene",
        "Suggestive",
        "شائن",
        "Shameful",
        "منحرف",
        "Perverted",
        "فاضح",
        "Indecent",
        "سافل",
        "Vulgar",
        "فاسق",
        "Immoral",
        "مبتذل",
        "Indelicate",
        "مشين",
        "Disgusting",
        "فاسد",
        "Corrupt",
        "Twisted",
        "مسيء",
        "Offensive",
        "gay",
        "lesbian",
        "غاي",
        "ليزبيان",
        "pussy",
        "ass",
        "مهبل",
        "مؤخرة",
        "زب",
        "سوة",
        "طيز",
        "ترمة",
        "تناسلي",
      ];
      // ["ass"];

      const containsForbiddenWord = forbiddenWords.some((word) =>
        message.message.text.includes(word),
      );

      if (containsForbiddenWord) {
        botly.sendText({
          id: senderId,
          text: "توقف عن كونك مقززا 🤢🫵",
        });
      } else {
        if (user.waiting) {
          botly.sendText({
            id: senderId,
            text: `
          🔴للحفاظ على افضل اداء للسيرفر 📟 , عليك الانتظار 30 ثانية 🕜 بين كل طلب 📶  \n تبقى [ ${user.timer}] ثانية ⏰
          `,
          });
        }
        // Handle text message
        console.log("Received text:", message.message.text);

        if (user.cont) {
          botly.sendText({
            id: senderId,
            text: ` يتم معالجة طلبك 🎨\n 🕜انتظر من فضلك....`,
          });
          if (user.timer > 0) {
            await updateUser(senderId, {
              waiting: true,
              cont: false,
            });
            countdown(senderId, user);
            botly.sendText({
              id: senderId,
              text: `🔴للحفاظ على افضل اداء للسيرفر 📟 , عليك الانتظار 30 ثانية 🕜 بين كل طلب 📶  \n تبقى [ ${user.timer}] ثانية ⏰ `,
            });
          } else if (user.timer <= 0) {
            await updateUser(senderId, {
              waiting: true,
              cont: false,
              timer: 30,
            });

            // console.log("this is it ", user.styleid);
            //data.append('sid', `${styleid}`);

            if (isArabic(message.message.text)) {
              // console.log("The text is in Arabic.");
              const translate = await axios.get(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=aren&dt=t&q=${message.message.text}`,
              );
              message.message.text = translate.data[0][0][0];
              // console.log(translate.data[0][0][0]) ;
            }

            //console.log("The text is not in Arabic.");

            try {
              const url = "https://cognise.art/api/mobile/txt2img/generate/v2";
              const headers = {
                Authorization: "token d8ec334912121e3bc1208a86e92328bc3922a38d",
                "Content-Type": "application/x-www-form-urlencoded",
              };

              const data = new URLSearchParams();
              /*_______data append _____*/
              data.append("negative_prompt", "astalavista");
              data.append("guidance_scale", "7");
              data.append("sampler_name", "Euler a");
              data.append("sampler_index", "Euler a");
              //data.append("img_ratio", "square");

              if (!user.img_ratio) {
                await updateUser(senderId, {
                  img_ratio: "cover",
                });
                user.img_ration = "cover";
              }
              if (!user.styleid) {
                user.styleid = "7";
              }
              data.append("img_ratio", `${user.img_ratio}`);
              data.append("generation_steps", "20");
              data.append("batch_size", "1");
              data.append("generation_seed", `${senderId}`);
              data.append("hit_point", "mobile");
              data.append(
                "user_uuid",
                Math.floor(Math.random() * 1000000).toString(),
              );
              data.append("sid", `${user.styleid}`);
              data.append("generation_prompt", `${message.message.text}`);
              //data.append("tz", "Africa/Algiers");
              /*_______data append _____*/

              botly.sendAction({ id: senderId, action: "typing_on" });
              const response = await axios.post(url, data, { headers });

              for (let i = 0; i < 1; i++) {
                console.log("............imgurl:..... generated.............");
                const imgurl = response.data.data.images[i].image;

                botly.sendAttachment({
                  id: senderId,
                  type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
                  payload: {
                    url: `https://cognise.art/${imgurl}`,
                  },
                  quick_replies: [
                    {
                      content_type: "text",
                      title: " تغيير الستايل",
                      payload: "backcp",
                    },
                    {
                      content_type: "text",
                      title: "الاعدادات",
                      payload: "تيتيتبت",
                    },
                  ],
                });
                //await delay(3000);

                botly.sendText({
                  id: senderId,
                  text: `/________[  ${message.message.text}  ]  _________ /`,
                  quick_replies: [
                    {
                      content_type: "text",
                      title: "تغيير الستايل",
                      payload: "coi",
                    },
                    {
                      content_type: "text",
                      title: "الاعدادات",
                      payload: "hghghh",
                    },
                  ],
                });
              }

              // Remove typing indicator after sending all images
              botly.sendAction({ id: senderId, action: "typing_off" });

              countdown(senderId, user);
            } catch (error) {
              console.log("style problem");

              const data = new URLSearchParams();

              await updateUser(senderId, {
                cont: true,
                waiting: false,
                timer: 0,
              });
              botly.sendText({
                id: senderId,
                text: `فشل توليد الصورة بسبب الازدحام، اعد المحاولة لاحقا`,
              });
              botly.sendAction({ id: senderId, action: "typing_off" });
            }

            console.log("---------------finished---------------");

            //await new Promise((resolve) => setTimeout(resolve, 25000));

            // 15 seconds in milliseconds

            // Set cont back to true after 15 seconds
          }
        }
      }
    } else if (
      message.message.attachments &&
      message.message.attachments[0].type === "image"
    ) {
      if (user.imgwaiting) {
        botly.sendText({
          id: senderId,
          text: `🔴للحفاظ على افضل اداء للسيرفر 📟 , عليك الانتظار 30 ثانية 🕜 لارسال 📶 صورة جديدة 🏙️  \n تبقى [ ${user.imgtimer}] ثانية ⏰ `,
        });
      }
      if (user.imgcont) {
        botly.sendText({
          id: senderId,
          text: `يتم التعرف على الصورة🏙️ \n انتظر 🕜 من فضلك ... `,
        });
        if (user.imgtimer > 0) {
          /*await updateUser(senderId, {
          waiting: true,
          cont: false,
    */
          await updateUser(senderId, {
            imgwaiting: true,
            imgcont: false,
          });
          countdownimg(senderId, user);
          botly.sendText({
            id: senderId,
            text: `🔴للحفاظ على افضل اداء للسيرفر 📟 , عليك الانتظار 30 ثانية 🕜 لارسال 📶 صورة جديدة 🏙️  \n تبقى [ ${user.timer}] ثانية ⏰ `,
          });
        } else {
          await updateUser(senderId, {
            imgcont: false,
            imgwaiting: true,
            imgtimer: 30,
          });

          async function generatePromptViaImageUrl(userImageUrl) {
            const url = "https://cognise.art/api/generatepromptviaimage";
            const boundary = "6bccbfc2-829a-4e43-b045-9b3dfed4d117";

            try {
              //console.log("Sending request...");

              // Fetch the image from the URL using Axios
              const response = await axios.get(userImageUrl, {
                responseType: "arraybuffer",
              });

              // Create a FormData instance and append the image buffer
              const form = new FormData();
              form.append("img", Buffer.from(response.data, "binary"), {
                contentType: "image/png", // Adjust based on the actual content type
                knownLength: response.data.length,
                filename: "dummy.png", // Simulated filename
              });

              // Make the API call
              const apiResponse = await axios.post(url, form, {
                headers: {
                  Authorization:
                    "token d8ec334912121e3bc1208a86e92328bc3922a38d",
                  "Content-Disposition": "attachment; filename=dummy.png", // Simulate file upload
                  "Content-Type": "multipart/form-data; boundary=" + boundary,
                  ...form.getHeaders(),
                },
              });

              //console.log("Response:", apiResponse.data.data.caption);
              // Further processing of the response can be added here

              const translate2 = await axios.get(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${apiResponse.data.data.caption}`,
              );
              //console.log("tran", translate2.data[0][0]);

              const caption = translate2.data[0][0][0];

              botly.sendText({
                id: senderId,
                text: `${caption}`,
                quick_replies: [
                  {
                    content_type: "text",
                    title: "تغيير الستايل",
                    payload: "coi",
                  },
                  {
                    content_type: "text",
                    title: "الاعدادات",
                    payload: "hghghh",
                  },
                ],
              });

              /*botly.sendText({
                id: senderId,
                text: `${caption}`,

              });*/
              botly.sendAction({ id: senderId, action: "typing_off" });
            } catch (error) {
              console.log("no i can't make images");
              // console.log(error);
              await updateUser(senderId, {
                cont: true,
                waiting: false,
                timer: 0,
              });
              botly.sendText({
                id: senderId,
                text: ` خاصية التعرف على الصور معطلة `,
              });
              botly.sendAction({ id: senderId, action: "typing_off" });
            }
          }

          const userImageUrl = `${message.message.attachments[0].payload.url}`; // Replace with your image URL
          generatePromptViaImageUrl(userImageUrl);
          // downloadImage(userImageUrl);
          countdownimg(senderId, user);
          await new Promise((resolve) => setTimeout(resolve, 30000));
          await updateUser(senderId, {
            imgcont: true,
            imgtimer: 0,
            imgwaiting: false,
          });
          //await new Promise((resolve) => setTimeout(resolve, 8000));
        }
      }
    } else {
      console.log("niggers");
    }
  }
};

const onPostBack = async (senderId, message, postback) => {
  const user = await checkSenderId(senderId);
  if (!user) {
    // no user
    const newUser = {
      senderId: senderId,
      context: null,
      choose: true,
      cont: false,
      styleid: null,
      waiting: false,
      timer: 0,
      resumetimer: false,
      imgtimer: 0,
      resumeimgtimer: false,
      imgwaiting: false,
      imgcont: true,
      messenger: true,
      lite: false,
      img_ratio: "cover",
    };

    await createUser(newUser).then(() => {
      botly.sendButtons({
        id: senderId,
        text: "مرحبا 👋\n انا بوت 🤖 لتوليد الصور  🌇 ب 12 ستايل مختلف 🏙️  اضغط زر [البدأ 🔵 ] لتحديد الستايل الذي تريده  \n ايضا يمكنني التعرف على الصور 🌁 التي ترسلها لي 📥   ",
        buttons: [
          botly.createPostbackButton("البدأ 🔵", "123"),
          // Add more buttons as needed
        ],
      });
    });
  } else {
    // const user = await checkSenderId(senderId);
    if (message.postback && message.postback.title.startsWith("اختيار")) {
      // const user = await checkSenderId(senderId);

      if (user.timer === 0) {
        await updateUser(senderId, {
          cont: true,
        });
      }
      await updateUser(senderId, {
        styleid: postback,
        choose: false,
      });

      const styl = await axios.get(`https://cognise.art/api/styles`, {
        headers,
      });

      for (let i = 0; i < styl.data.data.length; i++) {
        // console.log(styl.data.data[i].id) ;

        if (styl.data.data[i].id == postback) {
          //console.log("______", postback) ;

          botly.sendText({
            id: senderId,
            text: `تم ✅ تحديد ستايل 🖌️[${styl.data.data[i].title}] 🖌️ ارسل وصفا لما تريدني ان ارسمه 🎨`,
          });
        }
      }

      /*  const quickReplies = [
      {
        content_type: "text",
        title: `ادخال وصف`,
        payload: postback,
      },
      {
        content_type: "text",
        title: `تغيير الستايل`,
        payload: "",
      },
    ];

    botly.send({
      id: senderId,
      message: {
        text: `azert`,
        quick_replies: quickReplies,
      },
    });*/
    } else if (
      message &&
      message.message &&
      message.message.text &&
      message.message.text.startsWith("ادخال")
    ) {
    } else if (
      message &&
      message.message &&
      message.message.text &&
      message.message.text.startsWith("التالي")
    ) {
    } else if (
      (message.postback && message.postback.title.startsWith("البدأ")) ||
      (message &&
        message.message &&
        message.message.text &&
        message.message.text.startsWith("تغيير"))
    ) {
      if (user.messenger) {
        const style = await axios.get(`https://cognise.art/api/styles`, {
          headers,
        });

        const list = [];
        style.data.data.slice(0, 9).forEach((x) => {
          const contents = {
            title: `${x.title}`,
            image_url: `https://cognise.art/${x.image}`,
            subtitle: x.description,
            buttons: [
              botly.createPostbackButton("اختيار 🔵", x.id),

              botly.createPostbackButton("الاعدادات ⚙️", "options"),
              botly.createWebURLButton(
                "حساب المطور 🖥️ ",
                `https://www.facebook.com/profile.php?id=100024798374361&mibextid=hIlR13`,
              ),
              //botly.createPostbackButton(type.buttonText, type.postback)
            ],
          };

          list.push(contents);
        });
        botly.sendGeneric({
          id: senderId,
          elements: list,
          aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL,
        });

        const list2 = [];
        style.data.data.slice(9, 12).forEach((x) => {
          const contents = {
            title: `${x.title}`,
            image_url: `https://cognise.art/${x.image}`,
            subtitle: x.description,

            buttons: [
              botly.createPostbackButton("اختيار 🔵", x.id),

              botly.createPostbackButton("الاعدادات ⚙️", "options"),
              botly.createWebURLButton(
                "حساب المطور 🖥️ ",
                `https://www.facebook.com/profile.php?id=100024798374361&mibextid=hIlR13`,
              ),
              //botly.createPostbackButton(type.buttonText, type.postback)
            ],
          };

          list2.push(contents);
        });
        botly.sendGeneric({
          id: senderId,
          elements: list2,
          aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL,
        });
      }
      if (user.lite) {
        const style = await axios.get(`https://cognise.art/api/styles`, {
          headers,
        });

        //const list = [];
        style.data.data.slice(0, 9).forEach((x) => {
          const contents = {
            title: `${x.title}`,
            image_url: `https://cognise.art/${x.image}`,
            subtitle: x.description,
            buttons: [
              botly.createPostbackButton("اختيار 🔵", x.id),

              botly.createPostbackButton("الاعدادات ⚙️", "options"),
              botly.createWebURLButton(
                "حساب المطور 🖥️ ",
                `https://www.facebook.com/profile.php?id=100024798374361&mibextid=hIlR13`,
              ),
              //botly.createPostbackButton(type.buttonText, type.postback)
            ],
          };
          botly.sendGeneric({
            id: senderId,
            elements: contents,
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL,
          });
          //list.push(contents);
        });

        // const list2 = [];
        style.data.data.slice(9, 12).forEach((x) => {
          const content = {
            title: `${x.title}`,
            image_url: `https://cognise.art/${x.image}`,
            subtitle: x.description,

            buttons: [
              botly.createPostbackButton("اختيار 🔵", x.id),

              botly.createPostbackButton("الاعدادات ⚙️", "options"),
              botly.createWebURLButton(
                "حساب المطور 🖥️ ",
                `https://www.facebook.com/profile.php?id=100024798374361&mibextid=hIlR13`,
              ),
              //botly.createPostbackButton(type.buttonText, type.postback)
            ],
          };
          botly.sendGeneric({
            id: senderId,
            elements: content,
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL,
          });
          //list2.push(contents);
        });
      }
    }

    if (
      (message &&
        message.postback &&
        message.postback.title.startsWith("الاعدادات")) ||
      (message &&
        message.message &&
        message.message.text &&
        message.message.text.startsWith("الاعدادات"))
    ) {
      botly.sendButtons({
        id: senderId,
        text: " 👾اختر الوضع الذي يناسبك👾 ",
        buttons: [
          botly.createPostbackButton("وضع【🅻🅸🆃🅴】", "lite"),
          botly.createPostbackButton(" 🔵 وضع【🄼🄴🅂🅂🄰🄽🄶🄴🅁】 ", "messanger"),
          botly.createPostbackButton(" ابعاد الصور 🌆 ", "ratio"),
        ],
      });
    }
    if (postback === "ratio") {
      /* await updateUser(senderId, {
      lite: true,
      messenger: false,
    });
    botly.sendText({
      id: senderId,
      text: "🟢 تم تفعيل وضع الفايسبوك لايت 【🅻🅸🆃🅴】🟢",
    });*/

      const quickReplies = [
        {
          content_type: "text",
          title: "square",
          payload: "square",
        },
        {
          content_type: "text",
          title: "portrait",
          payload: "portrait",
        },
        {
          content_type: "text",
          title: "post",
          payload: "post",
        },
        {
          content_type: "text",
          title: "reel",
          payload: "reel",
        },
        {
          content_type: "text",
          title: "cover",
          payload: "cover",
        },
        // Add more quick replies as needed
      ];

      botly.send({
        id: senderId,
        message: {
          text: "______🔴 [ اختر ابعاد الصور ] 🔴______",
          quick_replies: quickReplies,
        },
      });
    }

    if (message && message.message && message.message.text) {
      const text = message.message.text.toLowerCase(); // Convert the received text to lowercase

      switch (text) {
        case "square":
          await updateUser(senderId, { img_ratio: "square" });
          botly.sendText({
            id: senderId,
            text: "_______🟢 تم تحديد square 🟢_______",
          });
          break;
        case "portrait":
          await updateUser(senderId, { img_ratio: "portrait" });
          botly.sendText({
            id: senderId,
            text: "_______🟢 تم تحديد portrait 🟢_______",
          });
          break;
        case "post":
          await updateUser(senderId, { img_ratio: "post" });
          botly.sendText({
            id: senderId,
            text: "_______تم تحديد post 🟢________",
          });
          break;
        case "reel":
          await updateUser(senderId, { img_ratio: "reel" });
          botly.sendText({
            id: senderId,
            text: "_______🟢 تم تحديد reel 🟢_______",
          });
          break;
        case "cover":
          await updateUser(senderId, { img_ratio: "cover" });
          botly.sendText({
            id: senderId,
            text: "_______🟢 تم تحديد cover 🟢_______",
          });
          break;
        default:
          // Handle other cases or no match
          break;
      }
    }

    if (postback === "lite") {
      await updateUser(senderId, {
        lite: true,
        messenger: false,
      });
      botly.sendText({
        id: senderId,
        text: "🟢 تم تفعيل وضع الفايسبوك لايت 【🅻🅸🆃🅴】🟢",
      });
    } else if (postback === "messanger") {
      await updateUser(senderId, {
        lite: false,
        messenger: true,
      });
      botly.sendText({
        id: senderId,
        text: "🔵 تم تفعيل وضع المسنجر【🄼🄴🅂🅂🄰🄽🄶🄴🅁】🔵",
      });
    }
  }
};

/*fetchDataAndPost();

// Refresh data every 2 minutes
setInterval(fetchDataAndPost,   0.2* 60 * 1000); */

app.listen(3000, () => {
  console.log(`App is on port : 3000`);
  keepAppRunning();
});
