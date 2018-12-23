module.exports=(sequelize,DataTypes)=>(
    sequelize.define('formula',{            // formula 데이터베이스 정의
        drying_index:{                      // 건조 지수 컬럼
            type:DataTypes.INTEGER,         // 데이터 타입은 Integer
            allowNull:true,                 // 생략 허용
        },
        discomfort_index:{                  // 불쾌 지수 컬럼
            type:DataTypes.INTEGER,         // 데이터 타입은 Integer
            allowNull:true,                 // 생략 허용
        },
    },{
        timestamps:true,
        paranoid:true,
    })
);