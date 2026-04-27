package storage

import (
	"context"
	"io"
	"log/slog"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Storage struct {
	client *minio.Client
	bucket string
}

func NewMinioStorage(endpoint, accessKey, secretKey, bucketName string) (*Storage, error) {
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil { return nil, err }

	ctx := context.Background()
	exists, errBucketExists := minioClient.BucketExists(ctx, bucketName)
	if errBucketExists == nil && !exists {
		err = minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: "us-east-1"})
		if err != nil { return nil, err }
		slog.Info("Storage bucket created", "bucket", bucketName)
	}

	return &Storage{client: minioClient, bucket: bucketName}, nil
}

func (s *Storage) UploadObject(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (minio.UploadInfo, error) {
	return s.client.PutObject(ctx, s.bucket, objectName, reader, objectSize, minio.PutObjectOptions{ContentType: contentType})
}

func (s *Storage) DownloadObject(ctx context.Context, objectName string) (*minio.Object, error) {
	return s.client.GetObject(ctx, s.bucket, objectName, minio.GetObjectOptions{})
}

func (s *Storage) DeleteObject(ctx context.Context, objectName string) error {
	return s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
}
