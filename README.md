# Public Image Gallery — simple GitHub Pages setup

This site is designed for exactly this workflow:

- Anyone can view the gallery without logging in.
- You control uploads.
- Every upload gets an upload number and date.
- Every image gets its own static HTML page with an `<img>` tag, alt text, description, canonical URL, Open Graph image metadata, and `ImageObject` structured data.
- `sitemap.xml` and `image-sitemap.xml` are updated automatically after each upload.
- The public gallery is optimized so search engines can crawl it.

## Important limitation

Publishing a public, crawlable image makes it **eligible** to appear in Google Images. It does **not** guarantee Google will index or rank it.

## 1. Create a public GitHub repository

Example repository name:

`public-image-gallery`

Upload all files from this folder to the repository root.

Keep these empty folders if possible:

- `images/`
- `image-pages/`

Git may not keep empty folders, and that is okay; the uploader will create files there later.

## 2. Turn on GitHub Pages

In your GitHub repository:

1. Open **Settings**
2. Open **Pages**
3. Under **Build and deployment**, choose **Deploy from a branch**
4. Select your main branch (normally `main`)
5. Choose `/ (root)`
6. Save

Your public address will normally look like:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

Visitors need no login.

## 3. Create a GitHub token only for uploads

Create a **fine-grained personal access token** in GitHub.

Give it access only to this repository, with:

- **Contents: Read and write**

Do not paste this token into any source file.

When you want to upload an image, open:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/admin.html`

Enter:

- your GitHub username
- repository name
- branch (`main`)
- your token

The website saves the username/repository/branch locally in your browser, but **does not save the token**.

## 4. Upload an image

On `admin.html`:

1. Choose the image
2. Enter a title
3. Choose the date
4. Write accurate alt text
5. Optionally add a description
6. Click **Upload & publish**

The uploader will automatically:

- add the image file
- assign its upload number
- add it to `gallery.json`
- create a dedicated search-friendly HTML page
- update `sitemap.xml`
- update `image-sitemap.xml`

GitHub Pages may need a minute or two to redeploy.

## 5. Help Google discover the site

Add the public site to **Google Search Console**.

Submit:

- `sitemap.xml`
- `image-sitemap.xml`

You can also use Search Console's URL inspection tool on the home page and individual image pages.

## Security notes

- The public gallery requires no login.
- The upload page itself is public, but a visitor still cannot edit your repository unless they possess a GitHub credential that already has write permission to your repository.
- Never hard-code your GitHub token into `admin.js`, HTML, or any public file.
- If you accidentally expose a token, revoke it immediately in GitHub.
- For this simple browser uploader, keep images under about 10 MB.

## What Google sees

Each image gets a page similar to:

`/image-pages/0001-example-image-123456789.html`

That page includes:

- the image in a normal `<img>` element
- descriptive `alt` text
- title and description
- upload date
- `ImageObject` structured data
- index/follow robots instruction
- a canonical URL

This gives Google a much clearer crawlable page than merely storing an image file somewhere.
