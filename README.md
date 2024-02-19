# TiktokAutoUploader v2.0

Fastest Tiktok AutoUploader using Requests, not ~~Selenium~~

Automatically Uploads to Tiktok with 1 command and within 3 seconds.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white&style=flat-square)]([https://www.linkedin.com/in/isaac-kogan-5a45b9193/](https://www.linkedin.com/in/michael-p-88b015200/) )
[![HitCount](https://hits.dwyl.com/makiisthenes/TiktokAutoUploader.svg?style=flat)](http://hits.dwyl.com/makiisthenes/https://githubcom/makiisthenes/TiktokAutoUploader)
![Forks](https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader)
![Stars](https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader)

<p align="center">
<image src="https://user-images.githubusercontent.com/52138450/111885490-04ab6680-89c0-11eb-955a-f833577b4406.png" width="35%">
</p>
<p align="center">
  <img alt="Forks" src="https://img.shields.io/github/forks/makiisthenes/TiktokAutoUploader" />
  <img alt="Stars" src="https://img.shields.io/github/stars/makiisthenes/TiktokAutoUploader" />
  <img alt="Watchers" src="https://img.shields.io/github/watchers/makiisthenes/TiktokAutoUploader" />
</p>

<p align="center">The <strong>Fastest</strong> Known <strong>TikTok Auto Video Uploader</strong> with requests not Selenium!</p>

--------------------------------------

# Quickstart

This guide covers how to get setup and running your bot ASAP, making basic usage of the library.

Want to manage multiple accounts, schedule more than 10 days ahead, and obtain videos from multiple sources automatically, use our service?

- ✔️ Uses Requests not Selenium (Super Fast)

- ✔️ Will not break when site layout changes. (Robust)

- ✔️ Handle multiple accounts on local machine (Multi-uploads)

- ✔️ Schedule videos up to 10 days in the future. (Autonomy)

- ✔️ Upload your own videos or use youtube short links. (Sourcing)

--------------------------------------
# Prerequistes

You must have Node installed on your computer, in order to run this, 
Please follow instructions in the provided URL, 

`https://nodejs.org/en/download`

Please make sure `node` is in your environment path before running, as it is required in the upload stage. 


--------------------------------------
### Installation

Clone the repository.

```bash
git clone https://github.com/makiisthenes/TiktokAutoUploader.git
```

Install requirements for package.

```bash
pip install -r requirements.txt
```
Install node packages.
```bash
cd tiktok_uploader/tiktok-signature/
npm i
```

------------
### Demo
Video showcases main usage of the app, uploading a video to TikTok.

<p align="center">
  <video src="https://github.com/makiisthenes/TiktokAutoUploader/assets/52138450/3dc36fd4-b9f4-4059-bcb4-c2ddca2a285d" controls poster="poster.jpg" width="320" height="240">
  </video>
</p>



------------


### Using program in CLI:

-----------------------------------

### Login to Account 🔒:

System handles multiple user accounts logging in, and will save this to system. This will prompt you to login into your tiktok account and store these cookies locally.

> ```bash
> # Login
> 
> python cli.py login -n my_saved_username
> ```

### Upload Videos 🖼️:

Users can select user, and upload a video from path or directly from a youtube shorts link.

```bash
# Upload from videos path
python cli.py upload --user my_saved_username -v "video.mp4" -t "My video title" 
```

```bash
# Upload from youtube link
python cli.py upload --user my_saved_username -yt "https://www.youtube.com/shorts/#####" -t "My video title" 
```

--------------------------------

### Show Current Users and Videos ⚙️:

All local videos must be saved under folder `VideosDirPath` if this doesn't exist please create one.

```bash
# Show all current videos found on system.
python cli.py show -v 
```

All cookies must be saved under folder `CookiesDir`, if this doesn't exist please create one.

```bash
# Show all current cookies found on system.
python cli.py show -c 
```

-----

### Help Command ℹ️:

If you are unsure with command, use the flag `-h`

```bash
# Show all current videos found on system.
python cli.py -h
python cli.py show -h
python cli.py login -h
python cli.py upload -h
```

 ----

## Professional Software💼

Fill waiting list form: https://forms.gle/M4KpdfruqCukQvj99

If you are looking for something more, which can get you faster to your goal, I offer software which can:

- ⭐ Clean and Modern UI

- ⭐ Proxy Support

- ⭐ Handling more than 1000 accounts!

- ⭐ Upload identical vidoes to multiple accounts automatically

- ⭐ Schedule videos for multiple accounts, 20 days to 2 years in advance. 

- 🌌 Automatically source videos from YouTube, X, Reddit, TikTok.

- 🌌 Setup uploading pipelines, from source to uploading schedule!

- 🌌 Metrics for viewing current performance of these different accounts.

- 🌌 Personalised support from me for any issues you may face for up to 3 months.

Available for purchase, if interested please email me at `michaelperes562@gmail.com` with subject line `Tiktok Bot Software` or else I might miss the email.

------

### Support this project ❤️

If you like the work provided, please consider supporting me through the available links for [Patreon ](https://patreon.com/makiisthenes)and [Ko-Fi](https://ko-fi.com/makiperes). 

Else if you have any requests or would like to contribute send a PR.

Alternative consider starring the project, or giving me a follow ;)

----

### Bugs and Issues and Future Work 🛠️

If you find any bugs or issues, please add to the issues tab, please do not email me relating to this, I will see on issues.

Will work to make this more user friendly including making a PyPI package.

------

### Old Branch 📕

If you would like to continue to use the library based uploader, please forward to old branch namely `old`

This still relies on Selenium which is slow and unreliable.

----

### Notes and Terms⌛

I am not responsible for any effects to your account, usage of such tools may ban your account. Please use at your own risk. 
