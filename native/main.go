package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"runtime"
	"time"

	"github.com/hugolgst/rich-go/client"
)

type AppManifest struct {
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	Path              string   `json:"path"`
	Type              string   `json:"type"`
	AllowedExtensions []string `json:"allowed_extensions"`
}

type Message struct {
	Type      string `json:"type"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	StartedAt int64  `json:"startedAt"`
}

func main() {
	exeFile, err := os.Executable()
	if err != nil {
		panic(err)
	}

	manifest, err := json.Marshal(AppManifest{
		Name:        "nicorich_native",
		Description: "nicorich ⇔ Discord Rich Presence",
		Path:        exeFile,
		Type:        "stdio",
		AllowedExtensions: []string{
			"nicorich@addons.rinsuki.net",
		},
	})
	if err != nil {
		panic(err)
	}

	if runtime.GOOS == "darwin" {
		home, err := os.UserHomeDir()
		if err != nil {
			panic(err)
		}
		dir := fmt.Sprintf("%s/Library/Application Support/Mozilla/NativeMessagingHosts", home)
		os.MkdirAll(dir, 0o755)
		if err := ioutil.WriteFile(fmt.Sprintf("%s/nicorich_native.json", dir), manifest, 0o644); err != nil {
			panic(err)
		}
	} else {
		panic(fmt.Errorf("currently not supported"))
	}

	if os.Args[1] == "install-manifest" {
		fmt.Print("\nManifest Installed!\n\nNext: Please Install Browser Extension\n\n")
		os.Exit(0)
	}

	err = client.Login("1005734172729544715")
	if err != nil {
		panic(err)
	}
	defer client.Logout()

	for {
		var length int32
		// TODO: detect host endian
		if err := binary.Read(os.Stdin, binary.LittleEndian, &length); err != nil {
			panic(err)
		}
		msgBinary := make([]byte, length)
		n, err := os.Stdin.Read(msgBinary)
		if err != nil {
			panic(err)
		}
		if n != int(length) {
			panic(fmt.Errorf("wrong length! %d!=%d", n, length))
		}

		var msg Message
		if err := json.Unmarshal(msgBinary, &msg); err != nil {
			panic(err)
		}

		if msg.Type != "playing" {
			panic(fmt.Errorf("unknown type %s", msg.Type))
		}

		startedAt := time.UnixMilli(msg.StartedAt)

		if err := client.SetActivity(client.Activity{
			Details: msg.Title,
			Timestamps: &client.Timestamps{
				Start: &startedAt,
			},
			Buttons: []*client.Button{
				&client.Button{
					Label: "見る",
					Url:   msg.URL,
				},
			},
		}); err != nil {
			panic(err)
		}

	}
}
